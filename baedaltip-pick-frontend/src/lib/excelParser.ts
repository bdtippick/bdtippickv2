// Excel 파싱 유틸리티 함수들 (프론트엔드용)

import * as XLSX from 'xlsx';
import { supabase, supabaseAdmin } from './supabaseClient';
import { parsingMap, TABLE_MAPPING } from './parsingMap';

// 라이더 ID 추출 패턴들
const RIDER_ID_PATTERNS = [
  /^(.+?)(\d{4})$/, // [이름]+[휴대폰번호뒤4자리] - 기본 패턴
  /^(.+?)[\s\-_]?(\d{4})$/, // [이름] [휴대폰번호뒤4자리] - 공백/구분자 포함
  /^(.{2,})$/ // 최소 2글자 이상의 이름 (휴대폰번호 없이)
];

// 진행률 콜백 타입
export type ProgressCallback = (current: number, total: number, currentSheet: string) => void;

// 숫자 정리 함수
function cleanAndParseNumber(value: any): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const cleaned = value.replace(/,/g, '').replace(/[^\d.-]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  }
  return 0;
}

// 라이더 ID 추출 함수
function extractRiderId(cellValue: any): string | null {
  if (!cellValue) return null;
  
  const str = String(cellValue).trim();
  if (!str) return null;
  
  // 패턴 1: [이름]+[휴대폰번호뒤4자리]
  const pattern1 = str.match(RIDER_ID_PATTERNS[0]);
  if (pattern1 && pattern1[1] && pattern1[2]) {
    return str; // 전체 문자열 반환
  }
  
  // 패턴 2: [이름] [휴대폰번호뒤4자리] (공백/구분자 포함)
  const pattern2 = str.match(RIDER_ID_PATTERNS[1]);
  if (pattern2 && pattern2[1] && pattern2[2]) {
    return str; // 전체 문자열 반환
  }
  
  // 패턴 3: 단순 이름 (최소 2글자)
  const pattern3 = str.match(RIDER_ID_PATTERNS[2]);
  if (pattern3 && str.length >= 2 && str.length <= 20) {
    return str;
  }
  
  return null;
}

// 엑셀 컬럼을 인덱스로 변환 (A=0, B=1, ...)
function columnToIndex(column: string): number {
  let result = 0;
  for (let i = 0; i < column.length; i++) {
    result = result * 26 + (column.charCodeAt(i) - 65 + 1);
  }
  return result - 1;
}

// 시트 처리 함수
async function processSheet(sheet: any, map: any, sheetName: string): Promise<any[]> {
  const jsonData = XLSX.utils.sheet_to_json(sheet, { 
    header: 1, 
    defval: "", 
    blankrows: false, 
    range: 0 
  });
  
  const startIndex = (map.dataStartRow || 1) - 1;
  const processedResults: any[] = [];
  
  console.log(`📊 Processing sheet: ${sheetName}, Total rows: ${jsonData.length}`);
  
  for (let i = startIndex; i < jsonData.length; i++) {
    const row = jsonData[i] as any[];
    if (!row || row.length === 0) continue;
    
    const identifierCol = map.identifier.excel_col;
    const identifierIndex = columnToIndex(identifierCol);
    const rawCellValue = row[identifierIndex];
    
    const riderId = extractRiderId(rawCellValue);
    
    if (riderId) {
      const rowData: any = { rider_id: riderId };
      
      // 모든 컬럼 추출
      for (const col of map.dataColumns) {
        const colIndex = columnToIndex(col.excel_col);
        let originalValue = row[colIndex];
        let processedValue = originalValue;
        
        console.log(`    📊 Column ${col.excel_col} (${col.db_key}): "${originalValue}"`);
        
        // 금액 관련 컬럼 처리
        if (['amount', 'total_orders', 'settlement_amount', 'total_support_fund', 
             'deduction_details', 'total_settlement_amount',
             'employment_insurance', 'industrial_accident_insurance', 'hourly_insurance',
             'retroactive_insurance', 'expected_settlement_amount', 'actual_payment_amount',
             'commission_deduction', 'remuneration'].includes(col.db_key)) {
          processedValue = cleanAndParseNumber(originalValue);
          console.log(`      💰 Amount processed: "${originalValue}" → ${processedValue}`);
        }
        
        rowData[col.db_key] = processedValue;
      }
      
      console.log(`  📋 Final row data:`, JSON.stringify(rowData, null, 2));
      
      processedResults.push(rowData);
    }
  }
  
  console.log(`✅ Sheet ${sheetName}: Found ${processedResults.length} valid rows`);
  return processedResults;
}

// 메인 Excel 파싱 및 저장 함수
export async function parseAndSaveExcel(
  file: File, 
  onProgress?: ProgressCallback
): Promise<{ success: boolean; message: string; totalSavedRows: number; results: any }> {
  try {
    console.log(`🚀 Starting Excel parsing for: ${file.name}`);
    
    // Excel 파일 읽기
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer);
    
    console.log(`📊 Available sheets: [${workbook.SheetNames.join(', ')}]`);
    
    const results: { [key: string]: any } = {};
    let totalSavedRows = 0;
    const sheetKeys = Object.keys(parsingMap);
    
    // 각 시트 처리
    for (let i = 0; i < sheetKeys.length; i++) {
      const mapKey = sheetKeys[i];
      const mapConfig = parsingMap[mapKey];
      
      if (onProgress) {
        onProgress(i + 1, sheetKeys.length, mapConfig.sheetName);
      }
      
      console.log(`🔄 Processing: ${mapKey}`);
      
      // 시트 찾기
      let sheet = workbook.Sheets[mapConfig.sheetName];
      let foundSheetName = mapConfig.sheetName;
      
      if (!sheet) {
        const similarSheet = workbook.SheetNames.find(name => 
          name.includes(mapConfig.sheetName) || mapConfig.sheetName.includes(name)
        );
        if (similarSheet) {
          sheet = workbook.Sheets[similarSheet];
          foundSheetName = similarSheet;
        }
      }
      
      if (!sheet) {
        console.warn(`⚠️ Sheet '${mapConfig.sheetName}' not found`);
        results[mapKey] = { found: false, error: "Sheet not found" };
        continue;
      }
      
      // 시트 데이터 처리
      const processedData = await processSheet(sheet, mapConfig, mapConfig.sheetName);
      
      // 데이터베이스에 저장
      if (processedData.length > 0) {
        const tableName = TABLE_MAPPING[mapKey];
        if (tableName) {
          console.log(`💾 Saving ${processedData.length} rows to ${tableName}`);
          console.log(`📝 Sample data to save:`, JSON.stringify(processedData.slice(0, 2), null, 2));
          
          // 기존 데이터 삭제
          console.log(`🗑️ Deleting existing data from ${tableName}...`);
          const { error: deleteError } = await supabaseAdmin.from(tableName).delete().neq('id', 0);
          
          if (deleteError) {
            console.error(`❌ Delete error:`, deleteError);
          } else {
            console.log(`✅ Existing data deleted from ${tableName}`);
          }
          
          // 새 데이터 삽입
          console.log(`📥 Inserting ${processedData.length} new rows...`);
          const { data: insertData, error: insertError } = await supabaseAdmin
            .from(tableName)
            .insert(processedData);
          
          if (insertError) {
            console.error(`❌ Insert error for ${tableName}:`, insertError);
            console.error(`❌ Failed data sample:`, JSON.stringify(processedData.slice(0, 1), null, 2));
            throw new Error(`Database insert failed: ${insertError.message}`);
          }
          
          console.log(`✅ Insert successful for ${tableName}:`, insertData);
          
          // 삽입 후 검증
          console.log(`🔍 Verifying saved data in ${tableName}...`);
          const { data: verifyData, error: verifyError } = await supabaseAdmin
            .from(tableName)
            .select('*')
            .limit(3);
          
          if (verifyError) {
            console.error(`❌ Verification failed:`, verifyError);
          } else {
            console.log(`✅ Verification successful - ${verifyData?.length || 0} rows found:`, verifyData);
          }
          totalSavedRows += processedData.length;
          
          results[mapKey] = {
            found: true,
            actualSheetName: foundSheetName,
            processedRowCount: processedData.length,
            savedToDatabase: true
          };
        }
      } else {
        results[mapKey] = {
          found: true,
          actualSheetName: foundSheetName,
          processedRowCount: 0,
          savedToDatabase: false
        };
      }
    }
    
    console.log(`🎉 Total saved: ${totalSavedRows} rows`);
    
    return {
      success: true,
      message: `파일 처리 완료! 총 ${totalSavedRows}개의 데이터가 저장되었습니다.`,
      totalSavedRows,
      results
    };
    
  } catch (error) {
    console.error('💥 Excel parsing error:', error);
    return {
      success: false,
      message: `처리 중 오류 발생: ${error instanceof Error ? error.message : String(error)}`,
      totalSavedRows: 0,
      results: {}
    };
  }
} 