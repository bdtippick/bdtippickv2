-- 배달팁픽 v2 최종 RLS 정책 수정
-- anon 사용자도 INSERT 가능하도록 설정

-- 기존 정책 삭제 후 새로 생성
DROP POLICY IF EXISTS "Allow all operations for service role" ON total_summary;
DROP POLICY IF EXISTS "Allow all operations for service role" ON support_funds;
DROP POLICY IF EXISTS "Allow all operations for service role" ON additional_support_funds;
DROP POLICY IF EXISTS "Allow all operations for service role" ON deductions;
DROP POLICY IF EXISTS "Allow all operations for service role" ON hourly_insurance_deductions;
DROP POLICY IF EXISTS "Allow all operations for service role" ON retroactive_insurance_details;

-- anon과 authenticated 모두 INSERT 가능하도록 정책 생성
CREATE POLICY "Allow insert for all users" ON total_summary FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Allow insert for all users" ON support_funds FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Allow insert for all users" ON additional_support_funds FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Allow insert for all users" ON deductions FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Allow insert for all users" ON hourly_insurance_deductions FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Allow insert for all users" ON retroactive_insurance_details FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Service Role도 모든 작업 가능하도록
CREATE POLICY "Allow all for service role" ON total_summary FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for service role" ON support_funds FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for service role" ON additional_support_funds FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for service role" ON deductions FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for service role" ON hourly_insurance_deductions FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for service role" ON retroactive_insurance_details FOR ALL TO service_role USING (true) WITH CHECK (true); 