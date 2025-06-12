-- 파싱맵과 완전히 일치하도록 테이블 구조 수정

-- support_funds 테이블에 누락된 컬럼들 추가
ALTER TABLE support_funds 
ADD COLUMN IF NOT EXISTS date DATE,
ADD COLUMN IF NOT EXISTS rider_name TEXT,
ADD COLUMN IF NOT EXISTS store_name TEXT;

-- additional_support_funds 테이블에 누락된 컬럼들 추가  
ALTER TABLE additional_support_funds
ADD COLUMN IF NOT EXISTS date DATE,
ADD COLUMN IF NOT EXISTS rider_name TEXT,
ADD COLUMN IF NOT EXISTS type TEXT;

-- deductions 테이블에 누락된 컬럼들 추가
ALTER TABLE deductions
ADD COLUMN IF NOT EXISTS date DATE,
ADD COLUMN IF NOT EXISTS rider_name TEXT,
ADD COLUMN IF NOT EXISTS type TEXT,
ADD COLUMN IF NOT EXISTS store_name TEXT;

-- hourly_insurance_deductions 테이블에 누락된 컬럼들 추가
ALTER TABLE hourly_insurance_deductions
ADD COLUMN IF NOT EXISTS date DATE,
ADD COLUMN IF NOT EXISTS rider_name TEXT;

-- retroactive_insurance_details 테이블에 누락된 컬럼들 추가
ALTER TABLE retroactive_insurance_details
ADD COLUMN IF NOT EXISTS rider_name TEXT,
ADD COLUMN IF NOT EXISTS description TEXT;

-- total_summary 테이블에 누락된 컬럼들 추가
ALTER TABLE total_summary
ADD COLUMN IF NOT EXISTS total_support_fund DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS deduction_details DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_settlement_amount DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS employment_insurance DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS industrial_accident_insurance DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS hourly_insurance DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS retroactive_insurance DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS expected_settlement_amount DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS actual_payment_amount DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS commission_deduction DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS remuneration DECIMAL(12,2) DEFAULT 0; 