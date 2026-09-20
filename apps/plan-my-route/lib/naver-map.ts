const KOREAN_ADMIN_AREA_SUFFIX = /(?:특별자치시|광역시|시|군|구|읍|면|동)$/;

/**
 * 같은 이름의 장소가 전국에 흩어져 있어도 현재 지역의 결과가 먼저 나오도록
 * 주소에서 가장 구체적인 행정구역 두 단계를 장소명 앞에 붙인다.
 */
export function buildNaverPlaceSearchQuery(
	placeName: string,
	addressName?: string,
): string {
	const normalizedPlaceName = placeName.trim();
	const normalizedAddress = addressName?.trim() ?? "";

	if (!normalizedPlaceName) return normalizedAddress;
	if (!normalizedAddress) return normalizedPlaceName;

	const adminAreas = normalizedAddress
		.split(/\s+/)
		.filter((part) => KOREAN_ADMIN_AREA_SUFFIX.test(part))
		.slice(-2)
		.filter((part) => !normalizedPlaceName.includes(part));

	return [...adminAreas, normalizedPlaceName].join(" ");
}
