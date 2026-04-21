import { describe, expect, test } from "bun:test";
import { gridLinearIndex, gridMatchesShard } from "./grid-shard";

describe("grid-shard", () => {
	test("linear index는 nx,ny에 대해 일대일", () => {
		expect(gridLinearIndex(1, 1)).toBe(0);
		expect(gridLinearIndex(1, 253)).toBe(252);
		expect(gridLinearIndex(2, 1)).toBe(253);
		expect(gridLinearIndex(149, 253)).toBe(148 * 253 + 252);
	});

	test("gridMatchesShard는 linearIndex % total 과 동치", () => {
		for (let nx = 1; nx <= 20; nx += 7) {
			for (let ny = 1; ny <= 30; ny += 11) {
				for (let total = 2; total <= 5; total += 1) {
					for (let shard = 0; shard < total; shard += 1) {
						expect(gridMatchesShard(nx, ny, shard, total)).toBe(
							gridLinearIndex(nx, ny) % total === shard,
						);
					}
				}
			}
		}
	});
});
