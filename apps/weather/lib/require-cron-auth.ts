import type { NextRequest } from "next/server";

export const requireCronAuth = (req: NextRequest): Response | null => {
	const expected = process.env.CRON_SECRET;
	const auth = req.headers.get("authorization");
	if (!expected || auth !== `Bearer ${expected}`) {
		return new Response("Unauthorized", { status: 401 });
	}
	return null;
};
