/** 짧은 추적 키 (tracked_grids.reason 용). */
export const polylineReasonTag = (poly: [number, number][]): string => {
	const s = poly.map((p) => `${p[0].toFixed(5)},${p[1].toFixed(5)}`).join("|");
	let h = 5381;
	for (let i = 0; i < s.length; i += 1) {
		h = (h * 33) ^ s.charCodeAt(i);
	}
	return `along:${(h >>> 0).toString(36)}`;
};
