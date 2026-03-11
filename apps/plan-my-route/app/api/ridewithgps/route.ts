import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
	const { searchParams } = new URL(request.url);
	const routeId = searchParams.get("routeId");

	if (!routeId) {
		return NextResponse.json({ error: "routeId is required" }, { status: 400 });
	}

	try {
		const res = await fetch(
			`https://ridewithgps.com/routes/${routeId}.json`,
			{
				headers: {
					Accept: "application/json",
					"User-Agent": "plan-my-route/1.0",
				},
				next: { revalidate: 3600 }, // 1시간 캐시
			},
		);

		if (!res.ok) {
			return NextResponse.json(
				{ error: `RideWithGPS returned ${res.status}` },
				{ status: res.status },
			);
		}

		const data = await res.json();
		return NextResponse.json(data);
	} catch (err) {
		console.error("Failed to fetch RideWithGPS route:", err);
		return NextResponse.json(
			{ error: "Failed to fetch route" },
			{ status: 500 },
		);
	}
}
