import { test, expect } from "@playwright/test";

test("크롤러도 공개 캐시를 사용하며 인증된 변경만 양쪽 언어를 갱신한다", async ({ request }) => {
  test.skip(process.env.KFONDO_E2E_PRODUCTION !== "1", "캐시 검증에는 운영 빌드가 필요하다");
  const urls = ["/cache-probe", "/en/cache-probe"];
  const first = await Promise.all(urls.map((url) => request.get(url)));
  for (const response of first) {
    expect(response.status()).toBe(200);
    expect(response.headers()["set-cookie"]).toBeUndefined();
    expect(await response.text()).toMatch(/(?:캐시 확인|Cache probe) 1/);
  }
  await request.post("http://127.0.0.1:4319/__fixture/cache-probe");
  // 저장소의 값이 바뀌어도 수집 봇 요청마다 서버 렌더링하지 않는다.
  for (const url of urls) {
    const response = await request.get(url, { headers: { "User-Agent": "Googlebot" } });
    expect(await response.text()).toMatch(/(?:캐시 확인|Cache probe) 1/);
  }
  expect((await request.post("/api/revalidate", { data: { tag: "event-cache-probe" } })).status()).toBe(401);
  expect(await (await request.get(urls[0])).text()).toContain("캐시 확인 1");
  const invalidation = await request.post("/api/revalidate", {
    headers: { Authorization: "Bearer fixture-revalidate-secret" }, data: { tag: "event-cache-probe" },
  });
  expect(invalidation.status()).toBe(200);
  for (const url of urls) {
    await expect.poll(async () => (await request.get(url)).text()).toMatch(/(?:캐시 확인|Cache probe) 2/);
  }
});
