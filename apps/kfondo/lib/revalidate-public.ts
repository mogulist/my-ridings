import { revalidatePath, revalidateTag } from "next/cache";

export function invalidatePublicHome() {
  // 리라이트의 목적지인 실제 언어 경로를 무효화한다.
  revalidatePath("/ko");
  revalidatePath("/en");
  revalidatePath("/sitemap.xml");
}

export function invalidatePublicEvent(slug: string) {
  if (!/^[a-z0-9][a-z0-9-]*$/i.test(slug)) throw new Error("Invalid event slug");
  revalidateTag(`event-${slug}`, { expire: 0 });
  for (const locale of ["ko", "en"]) {
    revalidatePath(`/${locale}/${slug}`);
    revalidatePath(`/${locale}/find-by-record/${slug}`, "layout");
  }
  invalidatePublicHome();
}
