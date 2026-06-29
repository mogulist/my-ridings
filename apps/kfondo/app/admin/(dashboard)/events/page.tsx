import { createClient } from "@/lib/supabase/server";
import { DataTable } from "@/components/ui/data-table";
import { columns } from "./columns";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus } from "lucide-react";

type EventRowWithEditions = {
  id: string;
  slug: string;
  name: string;
  location: string;
  color_from: string;
  color_to: string;
  meta_title: string;
  meta_description: string;
  meta_image: string;
  comment: string | null;
  created_at: string;
  updated_at: string;
  event_editions?: { date: string }[];
};

function getLatestEditionDate(
  editions: { date: string }[] | undefined
): string | null {
  if (!editions?.length) return null;
  const dates = editions.map((e) => e.date).filter(Boolean);
  return dates.length ? dates.sort().reverse()[0] ?? null : null;
}

export default async function EventsPage() {
  const supabase = await createClient();

  const { data: rawEvents, error } = await supabase
    .from("events")
    .select("*, event_editions(date)")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching events:", error);
    return <div>Failed to load events.</div>;
  }

  const events = (rawEvents ?? [])
    .map((row) => {
      const r = row as EventRowWithEditions;
      const latest = getLatestEditionDate(r.event_editions);
      const { event_editions: _omit, ...event } = r;
      void _omit;
      return { ...event, latest_edition_date: latest };
    })
    .sort((a, b) => {
      const da = a.latest_edition_date ?? "";
      const db = b.latest_edition_date ?? "";
      return db.localeCompare(da);
    });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Events</h1>
        </div>
        <Button variant="outline" asChild>
          <Link href="/admin/events/new">
            <Plus className="mr-2 h-4 w-4" /> New Event
          </Link>
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={events}
        searchKey="name"
        searchParamKey="q"
        initialSorting={[{ id: "latest_edition_date", desc: true }]}
      />
    </div>
  );
}
