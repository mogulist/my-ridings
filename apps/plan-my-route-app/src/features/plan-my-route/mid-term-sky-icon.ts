/**
 * 기상청 중기 육상 `wf*` 문구(맑음·구름많음·흐림·흐리고 비 등)를
 * 단기 예보와 맞춘 SF Symbol 이름으로 매핑한다.
 */
export const midTermSkyIconName = (sky: string | null | undefined): string => {
	const raw = sky?.trim();
	if (!raw) return "cloud.fill";

	const compact = raw.replace(/\s+/g, "");

	if (/뇌우|번개|낙뢰|천둥/.test(compact)) return "cloud.bolt.rain.fill";
	if (/진눈개비/.test(compact)) return "cloud.sleet.fill";
	if (/눈|폭설/.test(compact)) return "cloud.snow.fill";
	if (/소나기/.test(compact)) return "cloud.heavyrain.fill";
	if (/비|우박|이슬비|가랑비|장마/.test(compact)) {
		if (/한때|가끔/.test(compact)) return "cloud.sun.rain.fill";
		return "cloud.rain.fill";
	}

	if (/구름많음|구름조금|구름많고/.test(compact)) return "cloud.sun.fill";
	if (/흐림|흐리고/.test(compact)) return "cloud.fill";
	if (/맑음|맑고/.test(compact)) return "sun.max.fill";

	return "cloud.sun.fill";
};
