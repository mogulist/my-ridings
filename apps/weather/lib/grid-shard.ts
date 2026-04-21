/** nx∈[1,149], ny∈[1,253] 단기예보 격자를 0..37696-1 로 일대일 나열. 샤딩 시 균등 분배에 사용. */
export const gridLinearIndex = (nx: number, ny: number): number => (nx - 1) * 253 + (ny - 1);

export const gridMatchesShard = (nx: number, ny: number, shard: number, total: number): boolean =>
	gridLinearIndex(nx, ny) % total === shard;
