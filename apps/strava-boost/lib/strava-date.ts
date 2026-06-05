/**
 * Strava API returns start_date_local with a trailing Z, but the time values are already local.
 * Parsing with `new Date(string)` wrongly treats Z as UTC and shifts the displayed time.
 */
export const parseStravaLocalDate = (dateString: string): Date => {
	const naive = dateString.replace(/Z$/, "");
	const [datePart, timePart = "00:00:00"] = naive.split("T");
	const [year, month, day] = datePart.split("-").map(Number);
	const [hour = 0, minute = 0, secondPart = 0] = timePart.split(":").map(Number);
	const second = Math.floor(secondPart);

	return new Date(year, month - 1, day, hour, minute, second);
};

export const getStravaLocalTimestamp = (dateString: string): number => {
	return parseStravaLocalDate(dateString).getTime();
};

export const getStravaLocalYear = (dateString: string): string => {
	return dateString.slice(0, 4);
};

export const formatStravaLocalDate = (dateString: string): string => {
	return new Intl.DateTimeFormat("ko-KR", {
		year: "numeric",
		month: "long",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	}).format(parseStravaLocalDate(dateString));
};
