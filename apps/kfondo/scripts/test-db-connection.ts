/**
 * Supabase DB 연결 테스트 스크립트
 * 사용법: bun run scripts/test-db-connection.ts
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log("🔍 Supabase 연결 테스트\n");

// 환경변수 체크
console.log("1. 환경변수 확인");
console.log(`   NEXT_PUBLIC_SUPABASE_URL: ${supabaseUrl ? "✅ 설정됨" : "❌ 없음"}`);
console.log(`   NEXT_PUBLIC_SUPABASE_ANON_KEY: ${supabaseAnonKey ? "✅ 설정됨" : "❌ 없음"}`);

if (!supabaseUrl || !supabaseAnonKey) {
  console.log("\n❌ 환경변수가 설정되지 않았습니다.");
  console.log("   .env.local 또는 .env.development.local 파일을 확인하세요.");
  process.exit(1);
}

// DB 연결 테스트
console.log("\n2. DB 연결 테스트");
const supabase = createClient(supabaseUrl, supabaseAnonKey);

try {
  const { data, error, count } = await supabase
    .from("events")
    .select("id, location", { count: "exact" });

  if (error) {
    console.log(`   ❌ 쿼리 실패: ${error.message}`);
    process.exit(1);
  }

  console.log(`   ✅ 연결 성공!`);
  console.log(`   📊 events 테이블: ${count}개 레코드\n`);

  console.log("3. 데이터 샘플 (처음 5개)");
  data?.slice(0, 5).forEach((event, i) => {
    console.log(`   ${i + 1}. ${event.id} (${event.location})`);
  });

  console.log("\n✅ 모든 테스트 통과!");
} catch (err) {
  console.log(`   ❌ 예외 발생: ${err}`);
  process.exit(1);
}
