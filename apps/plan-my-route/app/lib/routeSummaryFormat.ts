const DEFAULT_LOCALE = "ko-KR";

export function formatRouteDistanceFromMeters(
	meters: number,
	locale = DEFAULT_LOCALE,
) {
	const km = meters / 1000;
	const formatted = km.toLocaleString(locale, {
		minimumFractionDigits: 1,
		maximumFractionDigits: 1,
	});
	return `${formatted} km`;
}

export function formatRouteInteger(value: number, locale = DEFAULT_LOCALE) {
	return value.toLocaleString(locale, { maximumFractionDigits: 0 });
}
