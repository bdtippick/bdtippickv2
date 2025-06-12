-- 배달팁픽 데이터베이스 테이블 생성

-- 1. 종합 정산 테이블 (단일 레코드)
CREATE TABLE IF NOT EXISTS total_summary (
    id SERIAL PRIMARY KEY,
    rider_id TEXT UNIQUE NOT NULL,
    total_orders INTEGER DEFAULT 0,
    settlement_amount DECIMAL(12,2) DEFAULT 0,
    total_support_fund DECIMAL(12,2) DEFAULT 0,
    deduction_details DECIMAL(12,2) DEFAULT 0,
    total_settlement_amount DECIMAL(12,2) DEFAULT 0,
    employment_insurance DECIMAL(12,2) DEFAULT 0,
    industrial_accident_insurance DECIMAL(12,2) DEFAULT 0,
    hourly_insurance DECIMAL(12,2) DEFAULT 0,
    retroactive_insurance DECIMAL(12,2) DEFAULT 0,
    expected_settlement_amount DECIMAL(12,2) DEFAULT 0,
    actual_payment_amount DECIMAL(12,2) DEFAULT 0,
    commission_deduction DECIMAL(12,2) DEFAULT 0,
    remuneration DECIMAL(12,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 지원금 내역 테이블
CREATE TABLE IF NOT EXISTS support_funds (
    id SERIAL PRIMARY KEY,
    rider_id TEXT NOT NULL,
    date DATE,
    rider_name TEXT,
    store_name TEXT,
    amount DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 추가지원금 내역 테이블
CREATE TABLE IF NOT EXISTS additional_support_funds (
    id SERIAL PRIMARY KEY,
    rider_id TEXT NOT NULL,
    date DATE,
    rider_name TEXT,
    type TEXT,
    amount DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. 차감내역 테이블
CREATE TABLE IF NOT EXISTS deductions (
    id SERIAL PRIMARY KEY,
    rider_id TEXT NOT NULL,
    date DATE,
    rider_name TEXT,
    type TEXT,
    store_name TEXT,
    amount DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. 시간제보험 차감 테이블
CREATE TABLE IF NOT EXISTS hourly_insurance_deductions (
    id SERIAL PRIMARY KEY,
    rider_id TEXT NOT NULL,
    date DATE,
    rider_name TEXT,
    amount DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. 보험료 소급 내역 테이블
CREATE TABLE IF NOT EXISTS retroactive_insurance_details (
    id SERIAL PRIMARY KEY,
    rider_id TEXT NOT NULL,
    rider_name TEXT,
    description TEXT,
    amount DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성 (성능 향상)
CREATE INDEX IF NOT EXISTS idx_total_summary_rider_id ON total_summary(rider_id);
CREATE INDEX IF NOT EXISTS idx_support_funds_rider_id ON support_funds(rider_id);
CREATE INDEX IF NOT EXISTS idx_additional_support_funds_rider_id ON additional_support_funds(rider_id);
CREATE INDEX IF NOT EXISTS idx_deductions_rider_id ON deductions(rider_id);
CREATE INDEX IF NOT EXISTS idx_hourly_insurance_deductions_rider_id ON hourly_insurance_deductions(rider_id);
CREATE INDEX IF NOT EXISTS idx_retroactive_insurance_details_rider_id ON retroactive_insurance_details(rider_id);

-- Row Level Security (RLS) 활성화
ALTER TABLE total_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_funds ENABLE ROW LEVEL SECURITY;
ALTER TABLE additional_support_funds ENABLE ROW LEVEL SECURITY;
ALTER TABLE deductions ENABLE ROW LEVEL SECURITY;
ALTER TABLE hourly_insurance_deductions ENABLE ROW LEVEL SECURITY;
ALTER TABLE retroactive_insurance_details ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 읽을 수 있도록 정책 설정 (익명 사용자 포함)
CREATE POLICY "Allow read access for all users" ON total_summary FOR SELECT USING (true);
CREATE POLICY "Allow read access for all users" ON support_funds FOR SELECT USING (true);
CREATE POLICY "Allow read access for all users" ON additional_support_funds FOR SELECT USING (true);
CREATE POLICY "Allow read access for all users" ON deductions FOR SELECT USING (true);
CREATE POLICY "Allow read access for all users" ON hourly_insurance_deductions FOR SELECT USING (true);
CREATE POLICY "Allow read access for all users" ON retroactive_insurance_details FOR SELECT USING (true);

-- Service Role이 모든 작업을 할 수 있도록 정책 설정
CREATE POLICY "Allow all operations for service role" ON total_summary FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Allow all operations for service role" ON support_funds FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Allow all operations for service role" ON additional_support_funds FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Allow all operations for service role" ON deductions FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Allow all operations for service role" ON hourly_insurance_deductions FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Allow all operations for service role" ON retroactive_insurance_details FOR ALL USING (auth.role() = 'service_role'); 