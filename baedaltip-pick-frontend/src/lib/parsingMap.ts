// 배달팁픽 Excel 파싱 맵 (전체 컬럼)

export const parsingMap: { [key: string]: any } = {
  total_summary: {
    sheetName: "종합",
    dataType: "single",
    dataStartRow: 13,
    identifier: { db_key: "rider_id", excel_col: "C" },
    dataColumns: [
      { db_key: "total_orders", excel_col: "F" },
      { db_key: "settlement_amount", excel_col: "Z" },
      { db_key: "total_support_fund", excel_col: "AA" },
      { db_key: "deduction_details", excel_col: "AB" },
      { db_key: "total_settlement_amount", excel_col: "AC" },
      { db_key: "employment_insurance", excel_col: "AE" },
      { db_key: "industrial_accident_insurance", excel_col: "AG" },
      { db_key: "hourly_insurance", excel_col: "AH" },
      { db_key: "retroactive_insurance", excel_col: "AI" },
      { db_key: "expected_settlement_amount", excel_col: "AJ" },
      { db_key: "actual_payment_amount", excel_col: "AK" },
      { db_key: "commission_deduction", excel_col: "AM" },
      { db_key: "remuneration", excel_col: "AN" }
    ]
  },
  support_funds: {
    sheetName: "지원금",
    dataType: "list",
    dataStartRow: 7,
    identifier: { db_key: "rider_id", excel_col: "C" },
    dataColumns: [
      { db_key: "date", excel_col: "A" },
      { db_key: "rider_name", excel_col: "C" },
      { db_key: "store_name", excel_col: "D" },
      { db_key: "amount", excel_col: "L" }
    ]
  },
  additional_support_funds: {
    sheetName: "추가지원금",
    dataType: "list",
    dataStartRow: 6,
    identifier: { db_key: "rider_id", excel_col: "C" },
    dataColumns: [
      { db_key: "date", excel_col: "A" },
      { db_key: "rider_name", excel_col: "C" },
      { db_key: "type", excel_col: "D" },
      { db_key: "amount", excel_col: "E" }
    ]
  },
  deductions: {
    sheetName: "차감내역",
    dataType: "list",
    dataStartRow: 6,
    identifier: { db_key: "rider_id", excel_col: "D" },
    dataColumns: [
      { db_key: "date", excel_col: "B" },
      { db_key: "rider_name", excel_col: "D" },
      { db_key: "type", excel_col: "E" },
      { db_key: "store_name", excel_col: "F" },
      { db_key: "amount", excel_col: "J" }
    ]
  },
  hourly_insurance_deductions: {
    sheetName: "시간제보험(차감)",
    dataType: "list",
    dataStartRow: 6,
    identifier: { db_key: "rider_id", excel_col: "B" },
    dataColumns: [
      { db_key: "date", excel_col: "A" },
      { db_key: "rider_name", excel_col: "B" },
      { db_key: "amount", excel_col: "C" }
    ]
  },
  retroactive_insurance_details: {
    sheetName: "보험료(소급)",
    dataType: "list",
    dataStartRow: 6,
    identifier: { db_key: "rider_id", excel_col: "A" },
    dataColumns: [
      { db_key: "rider_name", excel_col: "A" },
      { db_key: "description", excel_col: "B" },
      { db_key: "amount", excel_col: "C" }
    ]
  }
};

// 데이터베이스 테이블 이름 매핑
export const TABLE_MAPPING: { [key: string]: string } = {
  'total_summary': 'total_summary',
  'support_funds': 'support_funds',
  'additional_support_funds': 'additional_support_funds',
  'deductions': 'deductions',
  'hourly_insurance_deductions': 'hourly_insurance_deductions',
  'retroactive_insurance_details': 'retroactive_insurance_details'
}; 