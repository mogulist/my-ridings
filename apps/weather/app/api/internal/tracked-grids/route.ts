import { sql } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { trackedGrids } from "@/db/schema";
import { requireInternalAuth } from "@/lib/require-internal-auth";

const bodySchema = z.object({
	nx: z.number().int(),
	ny: z.number().int(),
	reason: z.string().max(500).optional(),
});

export async function POST(req: NextRequest) {
	const deny = requireInternalAuth(req);
	if (deny) return deny;
	let json: unknown;
	try {
		json = await req.json();
	} catch {
		return Response.json({ error: "Invalid JSON" }, { status: 400 });
	}
	const parsed = bodySchema.safeParse(json);
	if (!parsed.success) {
		return Response.json({ error: parsed.error.flatten() }, { status: 400 });
	}
	const { nx, ny, reason } = parsed.data;
	await db
		.insert(trackedGrids)
		.values({ nx, ny, reason: reason ?? null })
		.onConflictDoUpdate({
			target: [trackedGrids.nx, trackedGrids.ny],
			set: {
				lastRequestedAt: new Date(),
				reason: sql`excluded.reason`,
			},
		});
	return Response.json({ ok: true, nx, ny });
}
