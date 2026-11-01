"use server";

import { invalidatePublicHome, invalidatePublicEvent } from "@/lib/revalidate-public";
import { requireAdmin } from "@/lib/require-admin";

async function revalidateStaging(payload: { path?: string; tag?: string }) {
  const base = process.env.STAGING_SITE_URL;
  const secret = process.env.REVALIDATE_SECRET;
  if (!base || !secret) return;
  const url = `${base.replace(/\/$/, "")}/api/revalidate`;
  try {
    await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify(payload),
    });
  } catch {
    // staging unreachable; local revalidation already done
  }
}

export async function revalidateHomePage() {
  await requireAdmin();
  invalidatePublicHome();
  await revalidateStaging({ path: "/" });
}

export async function revalidateEventPage(slug: string) {
  await requireAdmin();
  invalidatePublicEvent(slug);
  await revalidateStaging({ tag: `event-${slug}` });
}
