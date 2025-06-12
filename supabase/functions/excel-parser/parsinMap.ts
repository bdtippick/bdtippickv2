// supabase/functions/excel-parser/parsingMap.ts (사용자 요구사항 반영 버전)

export const parsingMap: { [key: string]: any } = {
    total_summary: {
        sheetName: "종합",
        dataType: "single",
        dataStartRow: 13, // 2줄 더 보이도록 15→13으로 변경
        identifier: { db_key: "rider_id", excel_col: "C" }, // C열에 라이더 ID
        dataColumns: [
            { db_key: "total_orders", excel_col: "F" },
            { db_key: "settlement_amount", excel_col: "D" },
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
        dataStartRow: 7, // Row 7부터 실제 데이터 시작
        identifier: { db_key: "rider_id", excel_col: "C" }, // C열에 라이더 ID (성함)
        dataColumns: [
            { db_key: "date", excel_col: "A" }, // 주문일자
            { db_key: "rider_name", excel_col: "C" }, // 성함
            { db_key: "store_name", excel_col: "D" }, // 스토어명
            { db_key: "support_amount", excel_col: "L" } // 지원금 (L열로 수정)
        ]
    },
    additional_support_funds: {
        sheetName: "추가지원금",
        dataType: "list",
        dataStartRow: 6, // Row 6부터 실제 데이터 시작
        identifier: { db_key: "rider_id", excel_col: "C" }, // C열에 라이더 ID (성함)
        dataColumns: [
            { db_key: "date", excel_col: "A" }, // 주문일자
            { db_key: "rider_name", excel_col: "C" }, // 성함
            { db_key: "type", excel_col: "D" }, // 구분
            { db_key: "amount", excel_col: "E" } // 금액 (E열, 구조 분석에서 "1000" 확인됨)
        ]
    },
    deductions: {
        sheetName: "차감내역",
        dataType: "list",
        dataStartRow: 6, // Row 6부터 실제 데이터 시작
        identifier: { db_key: "rider_id", excel_col: "D" }, // D열에 라이더 ID (성함)
        dataColumns: [
            { db_key: "date", excel_col: "B" }, // 주문일자
            { db_key: "rider_name", excel_col: "D" }, // 성함
            { db_key: "type", excel_col: "E" }, // 구분
            { db_key: "store_name", excel_col: "F" }, // 스토어명
            { db_key: "amount", excel_col: "J" } // 금액 (정상 작동 중)
        ]
    },
    hourly_insurance_deductions: {
        sheetName: "시간제보험(차감)",
        dataType: "list",
        dataStartRow: 6, // Row 6부터 실제 데이터 시작 (정상)
        identifier: { db_key: "rider_id", excel_col: "B" }, // B열에 라이더 ID (이름)
        dataColumns: [
            { db_key: "date", excel_col: "A" }, // 일자
            { db_key: "rider_name", excel_col: "B" }, // 이름
            { db_key: "amount", excel_col: "C" } // 금액
        ]
    },
    retroactive_insurance_details: {
        sheetName: "보험료(소급)",
        dataType: "list",
        dataStartRow: 6, // Row 6부터 실제 데이터 시작 (정상)
        identifier: { db_key: "rider_id", excel_col: "A" }, // A열에 라이더 ID (이름)
        dataColumns: [
            { db_key: "rider_name", excel_col: "A" }, // 이름
            { db_key: "description", excel_col: "B" }, // 내역
            { db_key: "amount", excel_col: "C" } // 발생금액
        ]
    }
};