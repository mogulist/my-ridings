import { describe, expect, test } from "bun:test";
import { buildNaverPlaceSearchQuery } from "./naver-map";

describe("buildNaverPlaceSearchQuery", () => {
	test("시와 읍을 장소명 앞에 붙인다", () => {
		expect(
			buildNaverPlaceSearchQuery("탑모텔", "경북 영주시 풍기읍 동부리 123"),
		).toBe("영주시 풍기읍 탑모텔");
	});

	test("도시 주소에서는 가장 구체적인 두 행정구역을 사용한다", () => {
		expect(
			buildNaverPlaceSearchQuery("테스트호텔", "부산광역시 해운대구 우동 123"),
		).toBe("해운대구 우동 테스트호텔");
	});

	test("주소가 없으면 장소명만 사용한다", () => {
		expect(buildNaverPlaceSearchQuery("탑모텔")).toBe("탑모텔");
	});

	test("장소명이 없으면 기존처럼 주소를 사용한다", () => {
		expect(buildNaverPlaceSearchQuery("", "경북 영주시 풍기읍 동부리 123")).toBe(
			"경북 영주시 풍기읍 동부리 123",
		);
	});

	test("장소명에 이미 포함된 행정구역은 반복하지 않는다", () => {
		expect(
			buildNaverPlaceSearchQuery("풍기읍 탑모텔", "경북 영주시 풍기읍 동부리 123"),
		).toBe("영주시 풍기읍 탑모텔");
	});
});
