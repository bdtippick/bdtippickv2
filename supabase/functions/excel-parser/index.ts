// supabase/functions/excel-parser/index.ts (데이터베이스 저장 기능 추가)

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";
import { read, utils } from "https://esm.sh/xlsx@0.18.5";
import { parsingMap } from "./parsinMap.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// 라이더 ID 추출 패턴들
const RIDER_ID_PATTERNS = [
  /^(.+?)(\d{4})$/, // [이름]+[휴대폰번호뒤4자리] - 기본 패턴
  /^(.+?)[\s\-_]?(\d{4})$/, // [이름] [휴대폰번호뒤4자리] - 공백/구분자 포함
  /^(.{2,})$/ // 최소 2글자 이상의 이름 (휴대폰번호 없이)
];

// 분석 로그를 저장할 배열
let analysisLogs: string[] = [];

// 로그 함수 (콘솔과 배열에 동시 저장)
function log(message: string) {
  console.log(message);
  analysisLogs.push(message);
}

// 숫자 정리 함수 (디버깅 포함)
function cleanAndParseNumber(value: any): number {
  if (typeof value === 'number') {
    return value;
  }
  
  if (typeof value === 'string') {
    const str = value as string;
    const cleaned = str.replace(/[,\s]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  }
  
  return 0;
}

// 개선된 라이더 ID 추출 함수
function extractRiderId(cellValue: any, sheetName: string): string | null {
  if (!cellValue) return null;
  
  const str = cellValue.toString().trim();
  
  // 빈 값이나 너무 짧은 값은 제외
  if (!str || str.length < 2) {
    return null;
  }
  
  // 패턴 1: [이름]+[휴대폰번호뒤4자리] 시도
  const pattern1 = str.match(RIDER_ID_PATTERNS[0]);
  if (pattern1) {
    const name = pattern1[1].trim();
    const phoneLastFour = pattern1[2];
    return `${name}${phoneLastFour}`;
  }
  
  // 패턴 2: [이름] [휴대폰번호뒤4자리] (공백/구분자 포함) 시도
  const pattern2 = str.match(RIDER_ID_PATTERNS[1]);
  if (pattern2) {
    const name = pattern2[1].trim();
    const phoneLastFour = pattern2[2];
    return `${name}${phoneLastFour}`;
  }
  
  // 패턴 3: 이름만 있는 경우 (휴대폰번호 없음)
  const pattern3 = str.match(RIDER_ID_PATTERNS[2]);
  if (pattern3 && str.length >= 2 && str.length <= 20) { // 합리적인 이름 길이
    return str;
  }
  
  return null;
}

// 엑셀 컬럼을 인덱스로 변환 (A=0, B=1, ...)
function columnToIndex(column: string): number {
  let result = 0;
  const col = column as string;
  for (let i = 0; i < col.length; i++) {
    result = result * 26 + (col.charCodeAt(i) - 65 + 1);
  }
  return result - 1;
}

// 데이터베이스 테이블 이름 매핑
const TABLE_MAPPING: { [key: string]: string } = {
  'total_summary': 'total_summary',
  'support_funds': 'support_funds',
  'additional_support_funds': 'additional_support_funds',
  'deductions': 'deductions',
  'hourly_insurance_deductions': 'hourly_insurance_deductions',
  'retroactive_insurance_details': 'retroactive_insurance_details'
};

// 시트 처리 함수 (분석 또는 저장)
async function processSheet(sheet: any, map: any, supabase: any, saveMode: boolean = false): Promise<any> {
  if (!sheet) return { data: [], analysis: "Sheet not found" };

  log(`\n🔍 Processing sheet: ${map.sheetName} (${saveMode ? 'SAVE MODE' : 'ANALYSIS MODE'})`);
  
  // 전체 데이터 추출
  const jsonData = utils.sheet_to_json(sheet, { 
    header: 1, 
    defval: "", 
    blankrows: false, 
    range: 0 
  });
  
  const startIndex = (map.dataStartRow || 1) - 1;
  log(`📍 Data starts at row: ${map.dataStartRow}, array index: ${startIndex}`);
  log(`📊 Total rows in sheet: ${jsonData.length}`);
  
  // 저장 모드에서도 상세 구조 분석 (디버깅용)
  if (saveMode) {
    log(`\n🔍 === Debug: Analyzing sheet structure for ${map.sheetName} ===`);
    
    // 처음 10행의 구조를 보여줌
    for (let i = 0; i < Math.min(10, jsonData.length); i++) {
      const row = jsonData[i];
      if (row && row.length > 0) {
        const preview = row.slice(0, 16).map((cell: any, index: number) => {
          const colLetter = String.fromCharCode(65 + index);
          return `${colLetter}: "${cell || ''}"`;
        }).join(' | ');
        log(`  Row ${i + 1}: ${preview}`);
      }
    }
    
    // 데이터 시작 행 주변의 샘플 확인
    log(`\n📋 Sample data around start row from ${map.sheetName}:`);
    for (let i = Math.max(0, startIndex - 2); i < Math.min(jsonData.length, startIndex + 8); i++) {
      const row = jsonData[i];
      if (row && row.length > 0) {
        const identifierIndex = columnToIndex(map.identifier.excel_col);
        const preview = row.slice(0, 16).map((cell: any, index: number) => {
          const colLetter = String.fromCharCode(65 + index);
          const marker = index === identifierIndex ? ' <<<TARGET' : '';
          return `${colLetter}: "${cell || ''}"${marker}`;
        }).join(' | ');
        log(`  Row ${i + 1}: ${preview}`);
      }
    }
  }
  
  // 실제 데이터 처리
  const processedResults: any[] = [];
  const maxRows = saveMode ? jsonData.length : Math.min(startIndex + 5, jsonData.length); // 저장 모드에서는 전체, 분석 모드에서는 샘플만
  
  log(`🔄 Processing rows from ${startIndex} to ${maxRows} (saveMode: ${saveMode})`);
  
  for (let i = startIndex; i < maxRows; i++) {
    const row = jsonData[i];
    if (!row || row.length === 0) {
      if (saveMode) log(`⏭️ Skipping empty row ${i + 1}`);
      continue;
    }
    
    const identifierCol = map.identifier.excel_col;
    const identifierIndex = columnToIndex(identifierCol);
    const rawCellValue = row[identifierIndex];
    
    if (saveMode) log(`🔍 Row ${i + 1}: Checking identifier at column ${identifierCol} (index ${identifierIndex}): "${rawCellValue}"`);
    
    const riderId = extractRiderId(rawCellValue, map.sheetName);
    
    if (riderId) {
      if (saveMode) log(`✅ Row ${i + 1}: Valid rider ID found: "${riderId}"`);
      const rowData: any = { rider_id: riderId };
      
      // 모든 컬럼 추출
      for (const col of map.dataColumns) {
        const colIndex = columnToIndex(col.excel_col);
        let originalValue = row[colIndex];
        let processedValue = originalValue;
        
        if (saveMode) log(`📝 Row ${i + 1}: Column ${col.excel_col} (${col.db_key}): "${originalValue}"`);
        
        // 금액 관련 컬럼 처리
        if (['amount', 'total_orders', 'settlement_amount', 'total_support_fund', 
             'deduction_details', 'total_settlement_amount', 'support_amount',
             'employment_insurance', 'industrial_accident_insurance', 'hourly_insurance',
             'retroactive_insurance', 'expected_settlement_amount', 'actual_payment_amount',
             'commission_deduction', 'remuneration'].includes(col.db_key)) {
          processedValue = cleanAndParseNumber(originalValue);
          if (saveMode) log(`💰 Row ${i + 1}: Amount processed: "${originalValue}" → ${processedValue}`);
        }
        
        // 날짜 필드 처리
        if (col.db_key === 'date' && originalValue) {
          // Excel 날짜를 문자열로 변환
          if (typeof originalValue === 'number') {
            // Excel 날짜는 1900년 1월 1일부터의 일 수
            const excelDate = new Date((originalValue - 25569) * 86400 * 1000);
            processedValue = excelDate.toISOString().split('T')[0];
            if (saveMode) log(`📅 Row ${i + 1}: Date processed: ${originalValue} → ${processedValue}`);
          } else if (typeof originalValue === 'string') {
            processedValue = originalValue;
            if (saveMode) log(`📅 Row ${i + 1}: Date kept as string: ${processedValue}`);
          }
        }
        
        rowData[col.db_key] = processedValue;
      }
      
      processedResults.push(rowData);
      if (saveMode) log(`✅ Row ${i + 1}: Added to results. Total so far: ${processedResults.length}`);
    } else {
      if (saveMode) log(`❌ Row ${i + 1}: No valid rider ID found, skipping`);
    }
  }
  
  log(`📊 Sheet ${map.sheetName}: Found ${processedResults.length} valid rows`);
  
  // 저장 모드에서 실제 데이터베이스에 저장
  if (saveMode && processedResults.length > 0) {
    const tableName = TABLE_MAPPING[Object.keys(parsingMap).find(key => parsingMap[key] === map) || ''];
    
    if (tableName) {
      log(`💾 Saving ${processedResults.length} rows to table: ${tableName}`);
      log(`📝 Sample data to save: ${JSON.stringify(processedResults[0], null, 2)}`);
      
      try {
        // 기존 데이터 삭제 (선택적)
        // const { error: deleteError } = await supabase
        //   .from(tableName)
        //   .delete()
        //   .neq('id', 0); // 모든 행 삭제
        
        // 새 데이터 삽입
        const { data: insertData, error: insertError } = await supabase
          .from(tableName)
          .insert(processedResults);
        
        if (insertError) {
          log(`❌ Database insert error for ${tableName}: ${insertError.message}`);
          log(`❌ Error details: ${JSON.stringify(insertError, null, 2)}`);
          throw new Error(`Database insert failed for ${tableName}: ${insertError.message}`);
        }
        
        log(`✅ Successfully saved ${processedResults.length} rows to ${tableName}`);
        log(`✅ Insert result: ${JSON.stringify(insertData, null, 2)}`);
        
      } catch (error) {
        log(`💥 Save error for ${tableName}: ${error.message}`);
        throw error;
      }
    } else {
      log(`❌ No table mapping found for sheet type`);
    }
  } else if (saveMode && processedResults.length === 0) {
    log(`⚠️ No data to save for ${map.sheetName}`);
  }
  
  return {
    data: processedResults,
    totalRows: jsonData.length,
    dataStartRow: map.dataStartRow,
    targetColumn: map.identifier.excel_col,
    processedRowCount: processedResults.length,
    savedToDatabase: saveMode && processedResults.length > 0
  };
}

// 메인 서버 함수
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // 분석 로그 초기화
  analysisLogs = [];
  
  log(`\n🚀 Excel Parser Function Started`);
  log(`📅 Timestamp: ${new Date().toISOString()}`);

  try {
    const { filePath, originalFileName, saveMode = false } = await req.json(); // saveMode 매개변수 추가
    
    log(`\n📁 Processing file: ${originalFileName}`);
    log(`📍 File path: ${filePath}`);
    log(`💾 Save mode: ${saveMode ? 'ENABLED' : 'DISABLED'}`);
    
    // Supabase 클라이언트 생성
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables');
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // 파일 다운로드
    log(`📥 Downloading file from storage...`);
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('paystub-originals')
      .download(filePath);
    
    if (downloadError) {
      log(`❌ File download failed: ${downloadError.message}`);
      throw new Error(`File download failed: ${downloadError.message}`);
    }
    
    log(`✅ File downloaded successfully`);
    
    // 엑셀 파일 읽기
    log(`📖 Reading Excel file...`);
    const arrayBuffer = await fileData.arrayBuffer();
    const workbook = read(arrayBuffer);
    
    log(`📊 Available sheets in workbook: [${workbook.SheetNames.join(', ')}]`);
    
    // 시트 이름 매칭 분석 (분석 모드에서만 상세 출력)
    if (!saveMode) {
      log(`\n🔍 === Sheet Name Matching Analysis ===`);
    }
    
    const sheetAnalysis: any = {};
    
    Object.entries(parsingMap).forEach(([mapKey, mapConfig]) => {
      const targetSheetName = mapConfig.sheetName;
      const exactMatch = workbook.SheetNames.find(name => name === targetSheetName);
      const similarMatch = workbook.SheetNames.find(name => 
        name.includes(targetSheetName) || targetSheetName.includes(name)
      );
      
      if (!saveMode) {
        log(`${mapKey}: Looking for "${targetSheetName}"`);
        log(`  Exact match: ${exactMatch ? `✅ "${exactMatch}"` : '❌ None'}`);
        log(`  Similar match: ${similarMatch ? `🔍 "${similarMatch}"` : '❌ None'}`);
      }
      
      sheetAnalysis[mapKey] = {
        targetName: targetSheetName,
        exactMatch: exactMatch || null,
        similarMatch: similarMatch || null,
        found: !!(exactMatch || similarMatch)
      };
    });
    
    // 각 시트 처리 (분석 또는 저장)
    const results: { [key: string]: any } = {};
    let totalSavedRows = 0;
    
    for (const [mapKey, mapConfig] of Object.entries(parsingMap)) {
      log(`\n🔄 Processing configuration: ${mapKey}`);
      
      // 정확한 이름으로 찾기
      let sheet = workbook.Sheets[mapConfig.sheetName];
      let foundSheetName = mapConfig.sheetName;
      
      // 정확한 이름이 없다면 유사한 이름 찾기
      if (!sheet) {
        const similarSheet = workbook.SheetNames.find(name => 
          name.includes(mapConfig.sheetName) || mapConfig.sheetName.includes(name)
        );
        if (similarSheet) {
          sheet = workbook.Sheets[similarSheet];
          foundSheetName = similarSheet;
          log(`🔍 Using similar sheet name: "${foundSheetName}" instead of "${mapConfig.sheetName}"`);
        }
      }
      
      if (!sheet) {
        log(`⚠️ Sheet '${mapConfig.sheetName}' not found in the workbook`);
        results[mapKey] = { found: false, error: "Sheet not found" };
        continue;
      }
      
      log(`✅ Found sheet: "${foundSheetName}"`);
      
      const processResult = await processSheet(sheet, mapConfig, supabase, saveMode);
      results[mapKey] = {
        ...processResult,
        found: true,
        actualSheetName: foundSheetName
      };
      
      if (saveMode) {
        totalSavedRows += processResult.processedRowCount || 0;
      }
    }
    
    // 최종 요약
    log(`\n📋 === Final ${saveMode ? 'Save' : 'Analysis'} Summary ===`);
    Object.entries(results).forEach(([key, result]) => {
      const rowCount = result.processedRowCount || 0;
      log(`${key}: ${result.found ? '✅' : '❌'} ${rowCount} rows ${saveMode ? 'saved' : 'found'}`);
    });
    
    if (saveMode) {
      log(`🎉 Total rows saved to database: ${totalSavedRows}`);
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        message: saveMode ? 'File processed and saved to database' : 'File analysis completed',
        availableSheets: workbook.SheetNames,
        sheetAnalysis: sheetAnalysis,
        results: results,
                 analysisLogs: analysisLogs, // 항상 로그 반환
        fileName: originalFileName,
        saveMode: saveMode,
        totalSavedRows: saveMode ? totalSavedRows : undefined
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
    
  } catch (error) {
    log(`💥 Processing error: ${error.message}`);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        analysisLogs: analysisLogs
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});