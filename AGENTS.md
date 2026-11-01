# Project instructions

## Supabase table permissions

- Whenever creating or recreating a Supabase table exposed through the Data API, include explicit table `GRANT` statements in the same schema or migration SQL. Do not rely on automatic grants for new tables in `public`; that behavior ends on October 30, 2026 for existing projects.
- Grant only the operations required by the application's actual access paths. Public reads may need `SELECT` for `anon`; signed-in access may need specific operations for `authenticated`; server access through the Data API needs the appropriate grants for `service_role`. Do not copy broad grants to every role or every table.
- Keep grants consistent with RLS and its policies. Table grants and row-level policies are separate requirements; neither replaces the other.
- Ensure fresh project setup and database recreation also receive the required explicit grants. Preserve existing permissions unless a change is required by the task.
- The user requested this guidance for future table creation; do not change existing production database permissions solely because of this notice.

## CDN과 컴퓨팅 비용

- 이 저장소에서는 `proxy.ts`, `middleware.ts` 및 같은 역할의 Vercel Routing Middleware를 사용하지 않는다. 캐시 조회 전에 애플리케이션 코드를 실행하는 전역 처리를 추가하지 않는다.
- 공개 페이지는 정적 라우팅 규칙과 CDN 캐시를 우선한다. 언어 감지와 언어 제안은 페이지 표시 뒤 브라우저에서 처리한다.
- 인증과 세션 갱신은 필요한 서버 경로 안에서 수행한다. 관리자 응답은 캐시하지 않는다.
- Vercel Fluid CPU와 다른 자원 사용량 절감을 우선한다. 비용과 성능 또는 사용성이 실제로 충돌하면 사용자와 선택지 및 영향을 논의한다.
- 검색 크롤러도 공개 캐시를 사용하게 한다. 해외 요청이라는 이유만으로 차단하거나 크롤러 판별용 프록시를 추가하지 않는다.
