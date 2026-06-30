"use server";

import { revalidatePath, revalidateTag } from "next/cache";

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
  revalidatePath("/");
  await revalidateStaging({ path: "/" });
}

export async function revalidateEventPage(slug: string) {
  const tag = `event-${slug}`;
  revalidateTag(tag);
  revalidatePath("/", "layout");
  await revalidateStaging({ tag });
}
