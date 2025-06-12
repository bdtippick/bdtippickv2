-- 배달팁픽 v2 테이블들에 대한 INSERT 정책 추가
-- RLS 정책 문제 해결

-- 1. total_summary 테이블 INSERT 정책
CREATE POLICY "Enable insert for all users" ON "public"."total_summary"
AS PERMISSIVE FOR INSERT
TO public
WITH CHECK (true);

-- 2. support_funds 테이블 INSERT 정책
CREATE POLICY "Enable insert for all users" ON "public"."support_funds"
AS PERMISSIVE FOR INSERT
TO public
WITH CHECK (true);

-- 3. additional_support_funds 테이블 INSERT 정책
CREATE POLICY "Enable insert for all users" ON "public"."additional_support_funds"
AS PERMISSIVE FOR INSERT
TO public
WITH CHECK (true);

-- 4. deductions 테이블 INSERT 정책
CREATE POLICY "Enable insert for all users" ON "public"."deductions"
AS PERMISSIVE FOR INSERT
TO public
WITH CHECK (true);

-- 5. hourly_insurance_deductions 테이블 INSERT 정책
CREATE POLICY "Enable insert for all users" ON "public"."hourly_insurance_deductions"
AS PERMISSIVE FOR INSERT
TO public
WITH CHECK (true);

-- 6. retroactive_insurance_details 테이블 INSERT 정책
CREATE POLICY "Enable insert for all users" ON "public"."retroactive_insurance_details"
AS PERMISSIVE FOR INSERT  
TO public
WITH CHECK (true);

-- 추가: SELECT 정책도 함께 추가 (조회 권한)
CREATE POLICY "Enable read access for all users" ON "public"."total_summary"
AS PERMISSIVE FOR SELECT
TO public
USING (true);

CREATE POLICY "Enable read access for all users" ON "public"."support_funds"
AS PERMISSIVE FOR SELECT
TO public
USING (true);

CREATE POLICY "Enable read access for all users" ON "public"."additional_support_funds"
AS PERMISSIVE FOR SELECT
TO public
USING (true);

CREATE POLICY "Enable read access for all users" ON "public"."deductions"
AS PERMISSIVE FOR SELECT
TO public
USING (true);

CREATE POLICY "Enable read access for all users" ON "public"."hourly_insurance_deductions"
AS PERMISSIVE FOR SELECT
TO public
USING (true);

CREATE POLICY "Enable read access for all users" ON "public"."retroactive_insurance_details"
AS PERMISSIVE FOR SELECT
TO public
USING (true); 