import type { NextRequest } from "next/server";

export const requireInternalAuth = (req: NextRequest): Response | null => {
	const expected = process.env.INTERNAL_API_KEY;
	const auth = req.headers.get("authorization");
	if (!expected || auth !== `Bearer ${expected}`) {
		return new Response("Unauthorized", { status: 401 });
	}
	return null;
};
