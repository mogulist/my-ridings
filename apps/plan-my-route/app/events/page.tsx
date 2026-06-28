"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PlusCircle, Calendar, MapPin, ArrowLeft } from "lucide-react";
import { EVENT_TYPE_LABELS, type EventRow, type EventType } from "@/app/types/event";

export default function EventsAdminPage() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    name: "",
    event_type: "gran_fondo" as EventType,
    event_date: "",
    official_distance_km: "",
    official_elevation_m: "",
    search_keywords: "",
    organizer_name: "",
  });

  useEffect(() => {
    fetch("/api/events")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setEvents(data);
        else setError(data.error ?? "Failed to load events");
      })
      .catch(() => setError("Failed to load events"))
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          event_type: form.event_type,
          event_date: form.event_date,
          official_distance_km: form.official_distance_km ? Number(form.official_distance_km) : null,
          official_elevation_m: form.official_elevation_m ? Number(form.official_elevation_m) : null,
          search_keywords: form.search_keywords
            ? form.search_keywords.split(",").map((k) => k.trim()).filter(Boolean)
            : [],
          organizer_name: form.organizer_name || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error ?? "Failed to create event");
        return;
      }
      setEvents((prev) => [data, ...prev]);
      setForm({ name: "", event_type: "gran_fondo", event_date: "", official_distance_km: "", official_elevation_m: "", search_keywords: "", organizer_name: "" });
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`"${name}" 이벤트를 삭제하시겠습니까?`)) return;
    const res = await fetch(`/api/events/${id}`, { method: "DELETE" });
    if (res.ok) {
      setEvents((prev) => prev.filter((e) => e.id !== id));
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/" className="text-gray-500 hover:text-gray-700 dark:text-zinc-400">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-zinc-100">이벤트 관리</h1>
      </div>

      {/* 이벤트 생성 폼 */}
      <form onSubmit={handleCreate} className="mb-8 rounded-xl border border-gray-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-900">
        <h2 className="mb-4 text-base font-semibold text-gray-800 dark:text-zinc-200">새 이벤트 추가</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-zinc-400">이벤트 이름 *</label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="설악 그란폰도"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-zinc-400">날짜 *</label>
            <input
              required
              type="date"
              value={form.event_date}
              onChange={(e) => setForm((f) => ({ ...f, event_date: e.target.value }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-zinc-400">이벤트 유형</label>
            <select
              value={form.event_type}
              onChange={(e) => setForm((f) => ({ ...f, event_type: e.target.value as EventType }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            >
              {Object.entries(EVENT_TYPE_LABELS).map(([v, label]) => (
                <option key={v} value={v}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-zinc-400">검색 키워드 (쉼표 구분)</label>
            <input
              value={form.search_keywords}
              onChange={(e) => setForm((f) => ({ ...f, search_keywords: e.target.value }))}
              placeholder="설악 그란폰도, 설악그란폰도"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-zinc-400">공식 거리 (km)</label>
            <input
              type="number"
              value={form.official_distance_km}
              onChange={(e) => setForm((f) => ({ ...f, official_distance_km: e.target.value }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-zinc-400">공식 획득고도 (m)</label>
            <input
              type="number"
              value={form.official_elevation_m}
              onChange={(e) => setForm((f) => ({ ...f, official_elevation_m: e.target.value }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={creating}
          className="mt-4 flex items-center gap-2 rounded-lg bg-[#5842F4] px-4 py-2 text-sm font-medium text-white hover:bg-[#4733d4] disabled:opacity-50"
        >
          <PlusCircle className="h-4 w-4" />
          {creating ? "생성 중..." : "이벤트 생성"}
        </button>
      </form>

      {/* 이벤트 목록 */}
      {loading ? (
        <p className="text-sm text-gray-500">로딩 중...</p>
      ) : error ? (
        <p className="text-sm text-red-500">{error}</p>
      ) : events.length === 0 ? (
        <p className="text-sm text-gray-500">등록된 이벤트가 없습니다.</p>
      ) : (
        <ul className="space-y-3">
          {events.map((ev) => (
            <li key={ev.id} className="rounded-xl border border-gray-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
                      {EVENT_TYPE_LABELS[ev.event_type]}
                    </span>
                    <h3 className="truncate font-semibold text-gray-900 dark:text-zinc-100">{ev.name}</h3>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-3 text-xs text-gray-500 dark:text-zinc-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {ev.event_date}
                    </span>
                    {ev.official_distance_km && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {ev.official_distance_km}km
                        {ev.official_elevation_m ? ` / ${ev.official_elevation_m.toLocaleString()}m` : ""}
                      </span>
                    )}
                    {ev.search_keywords && ev.search_keywords.length > 0 && (
                      <span>키워드: {ev.search_keywords.join(", ")}</span>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Link
                    href={`/events/${ev.id}`}
                    className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  >
                    경유지 관리
                  </Link>
                  <button
                    onClick={() => handleDelete(ev.id, ev.name)}
                    className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400"
                  >
                    삭제
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
