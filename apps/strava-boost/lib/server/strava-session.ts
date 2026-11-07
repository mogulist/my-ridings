export class StorageError extends Error {
	constructor(
		message: string,
		public status: number,
	) {
		super(message);
	}
}

export async function ownerFor(request: Request) {
	const authorization = request.headers.get("authorization");
	if (!authorization?.startsWith("Bearer "))
		throw new StorageError("Strava 로그인이 필요합니다.", 401);
	// Never accept an athlete ID supplied by the browser as proof of ownership.
	const response = await fetch("https://www.strava.com/api/v3/athlete", {
		headers: { Authorization: authorization },
		cache: "no-store",
		signal: AbortSignal.timeout(10000),
	});
	if (!response.ok)
		throw new StorageError(
			"Strava 계정을 확인하지 못했습니다.",
			response.status === 401 ? 401 : response.status === 429 ? 429 : 502,
		);
	const athlete = await response.json();
	if (!Number.isSafeInteger(athlete.id) || athlete.id <= 0)
		throw new StorageError("Strava 인증 응답이 올바르지 않습니다.", 502);
	return athlete.id as number;
}
