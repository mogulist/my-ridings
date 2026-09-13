import { describe, expect, test } from "bun:test";
import type { NearbyDocument } from "@/lib/nearby-cache";
import {
	accommodationPreferenceWeight,
	analyzeStageEndPlaces,
	isLikelyAlwaysOpenConvenience,
} from "@/lib/stage-end-search";

function place(id: string, name: string, routeKm: number, address = "강원특별자치도 태백시") {
	return {
		id,
		place_name: name,
		place_url: "",
		address_name: address,
		road_address_name: "",
		phone: "",
		category_name: "",
		x: "128",
		y: "37",
		route_distance_m: routeKm * 1000,
		detour_m: 100,
	} satisfies NearbyDocument;
}

describe("stage-end-search", () => {
	test("CU·GS25·세븐일레븐만 야간 편의점 후보로 본다", () => {
		expect(isLikelyAlwaysOpenConvenience("CU 태백점")).toBe(true);
		expect(isLikelyAlwaysOpenConvenience("지에스25가 아닌 GS25 태백점")).toBe(true);
		expect(isLikelyAlwaysOpenConvenience("세븐일레븐 태백역점")).toBe(true);
		expect(isLikelyAlwaysOpenConvenience("이마트24 태백점")).toBe(false);
	});

	test("호텔·모텔을 펜션보다 높게 평가한다", () => {
		expect(accommodationPreferenceWeight("태백 호텔")).toBeGreaterThan(
			accommodationPreferenceWeight("태백 펜션"),
		);
	});

	test("숙소와 인정 편의점이 함께 있는 지역만 후보로 만든다", () => {
		const result = analyzeStageEndPlaces({
			startKm: 150,
			endKm: 180,
			accommodations: [
				place("hotel-a", "A호텔", 157),
				place("pension-a", "A펜션", 158),
				place("hotel-b", "B모텔", 176, "강원특별자치도 삼척시"),
			],
			conveniences: [place("cu-a", "CU 태백점", 159), place("emart-b", "이마트24 삼척점", 176)],
		});

		expect(result.acceptedConvenienceCount).toBe(1);
		expect(result.candidates.length).toBe(1);
		expect(result.candidates[0]?.areaName).toBe("강원특별자치도 태백시");
		expect(result.candidates[0]?.preferredAccommodationCount).toBe(1);
	});

	test("서로 가까운 고득점 구간은 하나의 후보 지역으로 압축한다", () => {
		const result = analyzeStageEndPlaces({
			startKm: 100,
			endKm: 140,
			accommodations: [place("h1", "호텔1", 110), place("h2", "호텔2", 116)],
			conveniences: [place("c1", "CU 1호점", 110), place("c2", "GS25 2호점", 116)],
		});

		expect(result.candidates.length).toBe(1);
	});
});
