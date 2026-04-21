/**
 * tmFc 앞 8자리 `YYYYMMDD`는 **KST 달력 날짜**(발표일)로 해석하고, 여기에 `dayOffset`일을 더해
 * `YYYY-MM-DD` 예보일 문자열을 만든다.
 *
 * `Date.UTC`로 더한 뒤 UTC 연·월·일을 읽는 방식은, 입력이 KST 달력이라는 전제에서
 * “날짜만” 증가시키는 효과와 같다(시·분은 무시).
 */
export const forecastYmdFromTmFc = (tmFc: string, dayOffset: number): string => {
	const base = tmFc.slice(0, 8);
	const y = Number(base.slice(0, 4));
	const mo = Number(base.slice(4, 6)) - 1;
	const d = Number(base.slice(6, 8));
	const t = Date.UTC(y, mo, d + dayOffset);
	const dt = new Date(t);
	const yyyy = String(dt.getUTCFullYear());
	const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
	const dd = String(dt.getUTCDate()).padStart(2, "0");
	return `${yyyy}-${mm}-${dd}`;
};
