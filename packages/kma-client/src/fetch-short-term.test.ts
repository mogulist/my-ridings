import { describe, expect, test } from "bun:test";
import { fetchVilageFcst } from "./fetch-short-term";

const mockFetch = (payload: unknown, ok = true, status = 200): typeof fetch =>
	(async () =>
		new Response(JSON.stringify(payload), {
			status,
			headers: { "content-type": "application/json" },
		})) as unknown as typeof fetch;

describe("fetchVilageFcst", () => {
	test("정상 응답을 정규화해서 반환", async () => {
		const payload = {
			response: {
				header: { resultCode: "00", resultMsg: "OK" },
				body: {
					items: {
						item: [
							{
								baseDate: "20260421",
								baseTime: "0500",
								category: "TMP",
								fcstDate: "20260421",
								fcstTime: "0600",
								fcstValue: "12",
								nx: 60,
								ny: 127,
							},
						],
					},
				},
			},
		};
		const r = await fetchVilageFcst({
			nx: 60,
			ny: 127,
			baseDate: "20260421",
			baseTime: "0500",
			authKey: "test-key",
			fetchImpl: mockFetch(payload),
		});
		expect(r?.baseAt).toBe("2026-04-20T20:00:00.000Z");
		expect(r?.hourly[0].tempC).toBe(12);
	});

	test("resultCode != 00 이면 KmaApiError", async () => {
		const payload = {
			response: {
				header: { resultCode: "03", resultMsg: "NO DATA" },
			},
		};
		await expect(
			fetchVilageFcst({
				nx: 60,
				ny: 127,
				baseDate: "20260421",
				baseTime: "0500",
				authKey: "x",
				fetchImpl: mockFetch(payload),
			}),
		).rejects.toMatchObject({ name: "KmaApiError", code: "03" });
	});

	test("HTTP 비정상이면 KmaApiError", async () => {
		await expect(
			fetchVilageFcst({
				nx: 60,
				ny: 127,
				baseDate: "20260421",
				baseTime: "0500",
				authKey: "x",
				fetchImpl: mockFetch({}, false, 500),
			}),
		).rejects.toMatchObject({ name: "KmaApiError", code: "500" });
	});
});
