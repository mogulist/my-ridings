import { describe, expect, test } from "bun:test";

import { moveItem } from "./plan-order";

describe("moveItem", () => {
	test("항목을 위아래로 이동하고 원본을 보존한다", () => {
		const original = ["A", "B", "C"];

		expect(moveItem(original, 2, 1)).toEqual(["A", "C", "B"]);
		expect(moveItem(original, 0, 2)).toEqual(["B", "C", "A"]);
		expect(original).toEqual(["A", "B", "C"]);
	});

	test("범위를 벗어난 이동은 순서를 유지한다", () => {
		expect(moveItem(["A", "B"], 0, -1)).toEqual(["A", "B"]);
		expect(moveItem(["A", "B"], 1, 2)).toEqual(["A", "B"]);
	});
});
