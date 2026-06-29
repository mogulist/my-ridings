import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { EventDetailContent } from "./event-detail-content";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditEventPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: event } = await supabase
    .from("events")
    .select("*, event_editions(*, courses(*))")
    .eq("id", id)
    .single();

  if (!event) {
    notFound();
  }

  return <EventDetailContent event={event as never} />;
}
