export const kstHourFromIso = (iso: string): number => {
	const parts = new Intl.DateTimeFormat("en-GB", {
		timeZone: "Asia/Seoul",
		hour: "2-digit",
		hour12: false,
	}).formatToParts(new Date(iso));
	const h = parts.find((p) => p.type === "hour")?.value;
	if (!h) return 0;
	return parseInt(h, 10) % 24;
};
