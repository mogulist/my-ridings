import { test, expect } from "@playwright/test";

test("2025 홍천 메디오폰도 04132855 기록은 순위 496", async ({ page }) => {
  await page.goto("/find-by-record/hongcheon/mediofondo/2025/04132855");
  await expect(page.getByText("496위")).toBeVisible();
  await expect(page.getByTestId("participant-main")).toHaveText("47.1%");
  await expect(page.getByTestId("finisher-main")).toHaveText("48.3%");
  await expect(page.getByTestId("participant-subLabel")).toHaveText(
    "1,051명 기준"
  );
  await expect(page.getByTestId("finisher-subLabel")).toHaveText(
    "1,024명 기준"
  );
});

test("2025 홍천 그란폰도 05253137 기록은 순위 541", async ({ page }) => {
  await page.goto("/find-by-record/hongcheon/granfondo/2025/05253137");
  await expect(page.getByText("541위")).toBeVisible();
  await expect(page.getByTestId("participant-main")).toHaveText("44.9%");
  await expect(page.getByTestId("finisher-main")).toHaveText("48.2%");
  await expect(page.getByTestId("participant-subLabel")).toHaveText(
    "1,202명 기준"
  );
  await expect(page.getByTestId("finisher-subLabel")).toHaveText(
    "1,120명 기준"
  );
});

test("2025 양양 그란폰도 07124578 기록은 순위 389", async ({ page }) => {
  await page.goto("/find-by-record/yangyang/granfondo/2025/07124578");
  await expect(page.getByText("389위")).toBeVisible();
  await expect(page.getByTestId("participant-main")).toHaveText("38.4%");
  await expect(page.getByTestId("finisher-main")).toHaveText("47.1%");
  await expect(page.getByTestId("participant-subLabel")).toHaveText(
    "1,011명 기준"
  );
  await expect(page.getByTestId("finisher-subLabel")).toHaveText("823명 기준");
});

test("2025 양양 메디오폰도 03384028 기록은 순위 410", async ({ page }) => {
  await page.goto("/find-by-record/yangyang/mediofondo/2025/03384028");
  await expect(page.getByText("410위")).toBeVisible();
  await expect(page.getByTestId("participant-main")).toHaveText("60.9%");
  await expect(page.getByTestId("finisher-main")).toHaveText("68.1%");
  await expect(page.getByTestId("participant-subLabel")).toHaveText(
    "672명 기준"
  );
  await expect(page.getByTestId("finisher-subLabel")).toHaveText("601명 기준");
});

test("2024 홍천 그란폰도 05572155 기록은 순위 1162", async ({ page }) => {
  await page.goto("/find-by-record/hongcheon/granfondo/2024/05572155");
  await expect(page.getByText("1162위")).toBeVisible();
  await expect(page.getByTestId("participant-main")).toHaveText("72.2%");
  await expect(page.getByTestId("finisher-main")).toHaveText("75.4%");
  await expect(page.getByTestId("participant-subLabel")).toHaveText(
    "1,607명 기준"
  );
  await expect(page.getByTestId("finisher-subLabel")).toHaveText(
    "1,540명 기준"
  );
});

test("2024 홍천 메디오폰도 04230517 기록은 순위 525", async ({ page }) => {
  await page.goto("/find-by-record/hongcheon/mediofondo/2024/04230517");
  await expect(page.getByText("525위")).toBeVisible();
  await expect(page.getByTestId("participant-main")).toHaveText("51.1%");
  await expect(page.getByTestId("finisher-main")).toHaveText("53.0%");
  await expect(page.getByTestId("participant-subLabel")).toHaveText(
    "1,026명 기준"
  );
  await expect(page.getByTestId("finisher-subLabel")).toHaveText("988명 기준");
});

test("2024 양양 그란폰도 09074266 기록은 순위 786", async ({ page }) => {
  await page.goto("/find-by-record/yangyang/granfondo/2024/09074266");
  await expect(page.getByText("786위")).toBeVisible();
  await expect(page.getByTestId("participant-main")).toHaveText("80.5%");
  await expect(page.getByTestId("finisher-main")).toHaveText("97.8%");
  await expect(page.getByTestId("participant-subLabel")).toHaveText(
    "975명 기준"
  );
  await expect(page.getByTestId("finisher-subLabel")).toHaveText("803명 기준");
});

test("2024 양양 메디오폰도 02310257 기록은 순위 45", async ({ page }) => {
  await page.goto("/find-by-record/yangyang/mediofondo/2024/02310257");
  await expect(page.getByText("45위")).toBeVisible();
  await expect(page.getByTestId("participant-main")).toHaveText("7.6%");
  await expect(page.getByTestId("finisher-main")).toHaveText("10.2%");
  await expect(page.getByTestId("participant-subLabel")).toHaveText(
    "576명 기준"
  );
  await expect(page.getByTestId("finisher-subLabel")).toHaveText("433명 기준");
});

test("2025 홍천 그란폰도 KOM 기록 조회는 KOM 라벨을 표시한다", async ({
  page,
}) => {
  await page.goto("/find-by-record/hongcheon/granfondo/2025/05253137?scope=kom");
  await expect(page.getByText("KOM")).toBeVisible();
  await expect(page.getByTestId("rank-label")).toHaveText("KOM 통합 순위");
  await expect(page.getByText("KOM 기록 주변")).toBeVisible();
});
