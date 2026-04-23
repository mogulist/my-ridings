type GridMetaForLabel = {
	nx: number;
	ny: number;
	lat: string | number;
	lng: string | number;
	midRegionLand: string | null;
	midRegionTemp: string | null;
	regionName?: string | null;
};

/** weather_grid_meta 한 행으로 짧은 표시 문자열. 지역명 → 좌표 → 격자 순 fallback. */
export const formatGridLabel = (meta: GridMetaForLabel): string => {
	const name = meta.regionName?.trim();
	if (name) return name;
	const la = Number(meta.lat);
	const ln = Number(meta.lng);
	if (Number.isFinite(la) && Number.isFinite(ln)) {
		return `${la.toFixed(2)}°, ${ln.toFixed(2)}°`;
	}
	return `격자 ${meta.nx}·${meta.ny}`;
};
