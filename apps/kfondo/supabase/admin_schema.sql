-- 1. 관리자 화이트리스트 테이블 생성
CREATE TABLE admin_whitelist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS 활성화
ALTER TABLE admin_whitelist ENABLE ROW LEVEL SECURITY;

-- 정책: 누구나 자신의 이메일이 화이트리스트에 있는지 '읽기'는 가능 (로그인 체크용)
CREATE POLICY "Allow public read access on admin_whitelist" ON admin_whitelist FOR SELECT USING (true);

-- 2. Events 테이블 등 주요 테이블에 대한 쓰기 권한 정책 추가

-- 헬퍼 함수: 현재 로그인한 사용자가 관리자인지 확인
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM admin_whitelist
    WHERE email = auth.jwt() ->> 'email'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Events 테이블 정책 (기존 읽기 정책은 유지하고, 쓰기 정책 추가)
CREATE POLICY "Enable insert for admins only" ON events FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Enable update for admins only" ON events FOR UPDATE USING (is_admin());
CREATE POLICY "Enable delete for admins only" ON events FOR DELETE USING (is_admin());

-- Event Editions 테이블 정책
CREATE POLICY "Enable insert for admins only" ON event_editions FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Enable update for admins only" ON event_editions FOR UPDATE USING (is_admin());
CREATE POLICY "Enable delete for admins only" ON event_editions FOR DELETE USING (is_admin());

-- Courses 테이블 정책
CREATE POLICY "Enable insert for admins only" ON courses FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Enable update for admins only" ON courses FOR UPDATE USING (is_admin());
CREATE POLICY "Enable delete for admins only" ON courses FOR DELETE USING (is_admin());

-- 초기 관리자 추가 (사용자 본인 이메일)
-- 실행 전 아래 이메일을 본인 GitHub 이메일로 변경하세요!
-- INSERT INTO admin_whitelist (email) VALUES ('your-email@example.com');
