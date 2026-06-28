"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { ArrowLeft, PlusCircle, Trash2, Pencil, GripVertical } from "lucide-react";
import {
  WAYPOINT_TYPE_LABELS,
  type EventWithWaypoints,
  type EventWaypointRow,
  type WaypointType,
  WAYPOINT_TYPES,
} from "@/app/types/event";

type Props = { params: Promise<{ id: string }> };

type WaypointFormState = {
  name: string;
  waypoint_type: WaypointType;
  lat: string;
  lng: string;
  elevation_m: string;
  distance_from_start_km: string;
  cutoff_seconds_from_start: string;
  supplies_available: string;
  is_mandatory_stop: boolean;
  memo: string;
};

const EMPTY_WAYPOINT_FORM: WaypointFormState = {
  name: "",
  waypoint_type: "supply",
  lat: "",
  lng: "",
  elevation_m: "",
  distance_from_start_km: "",
  cutoff_seconds_from_start: "",
  supplies_available: "",
  is_mandatory_stop: false,
  memo: "",
};

function formatCutoff(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

function secondsToHHMM(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}:${String(m).padStart(2, "0")}`;
}

function parseCutoffInput(val: string): number | null {
  // 허용 형식: "9:30" (9시간 30분) or "570" (분)
  const colonMatch = val.match(/^(\d+):(\d{2})$/);
  if (colonMatch) return Number(colonMatch[1]) * 3600 + Number(colonMatch[2]) * 60;
  const num = Number(val);
  if (Number.isFinite(num) && num >= 0) return Math.round(num * 60); // 분 입력
  return null;
}

function waypointToForm(wp: EventWaypointRow): WaypointFormState {
  return {
    name: wp.name,
    waypoint_type: wp.waypoint_type,
    lat: wp.lat != null ? String(wp.lat) : "",
    lng: wp.lng != null ? String(wp.lng) : "",
    elevation_m: wp.elevation_m != null ? String(wp.elevation_m) : "",
    distance_from_start_km: wp.distance_from_start_km != null ? String(wp.distance_from_start_km) : "",
    cutoff_seconds_from_start:
      wp.cutoff_seconds_from_start != null ? secondsToHHMM(wp.cutoff_seconds_from_start) : "",
    supplies_available: wp.supplies_available ?? "",
    is_mandatory_stop: wp.is_mandatory_stop,
    memo: wp.memo ?? "",
  };
}

function WaypointFormFields({
  form,
  setForm,
}: {
  form: WaypointFormState;
  setForm: React.Dispatch<React.SetStateAction<WaypointFormState>>;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-zinc-400">이름 *</label>
        <input
          required
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="1보급소"
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-zinc-400">유형 *</label>
        <select
          value={form.waypoint_type}
          onChange={(e) => setForm((f) => ({ ...f, waypoint_type: e.target.value as WaypointType }))}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
        >
          {WAYPOINT_TYPES.map((t) => (
            <option key={t} value={t}>{WAYPOINT_TYPE_LABELS[t]}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-zinc-400">
          위도 <span className="text-red-500">*</span>
        </label>
        <input
          required
          type="number"
          step="any"
          value={form.lat}
          onChange={(e) => setForm((f) => ({ ...f, lat: e.target.value }))}
          placeholder="37.12345"
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-zinc-400">
          경도 <span className="text-red-500">*</span>
        </label>
        <input
          required
          type="number"
          step="any"
          value={form.lng}
          onChange={(e) => setForm((f) => ({ ...f, lng: e.target.value }))}
          placeholder="128.12345"
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-zinc-400">
          경로 상 거리 (km) <span className="text-gray-400 font-normal">(선택)</span>
        </label>
        <input
          type="number"
          step="any"
          value={form.distance_from_start_km}
          onChange={(e) => setForm((f) => ({ ...f, distance_from_start_km: e.target.value }))}
          placeholder="45.3"
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-zinc-400">
          고도 (m) <span className="text-gray-400 font-normal">(선택)</span>
        </label>
        <input
          type="number"
          value={form.elevation_m}
          onChange={(e) => setForm((f) => ({ ...f, elevation_m: e.target.value }))}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
        />
      </div>
      {form.waypoint_type === "cutoff" && (
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-zinc-400">
            컷오프 시간 (출발 후, 형식: 9:30 = 9시간 30분)
          </label>
          <input
            value={form.cutoff_seconds_from_start}
            onChange={(e) => setForm((f) => ({ ...f, cutoff_seconds_from_start: e.target.value }))}
            placeholder="9:30"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          />
        </div>
      )}
      {(form.waypoint_type === "supply" || form.waypoint_type === "water") && (
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-zinc-400">제공 물품</label>
          <input
            value={form.supplies_available}
            onChange={(e) => setForm((f) => ({ ...f, supplies_available: e.target.value }))}
            placeholder="물, 바나나, 에너지바"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          />
        </div>
      )}
      <div className="sm:col-span-2">
        <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-zinc-400">메모</label>
        <input
          value={form.memo}
          onChange={(e) => setForm((f) => ({ ...f, memo: e.target.value }))}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
        />
      </div>
      <div className="flex items-center gap-2">
        <input
          id={`mandatory-${form.name}`}
          type="checkbox"
          checked={form.is_mandatory_stop}
          onChange={(e) => setForm((f) => ({ ...f, is_mandatory_stop: e.target.checked }))}
          className="h-4 w-4 rounded"
        />
        <label htmlFor={`mandatory-${form.name}`} className="text-sm text-gray-700 dark:text-zinc-300">필수 정차 지점</label>
      </div>
    </div>
  );
}

export default function EventDetailPage({ params }: Props) {
  const { id } = use(params);
  const [event, setEvent] = useState<EventWithWaypoints | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<WaypointFormState>(EMPTY_WAYPOINT_FORM);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<WaypointFormState>(EMPTY_WAYPOINT_FORM);
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    fetch(`/api/events/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.id) setEvent(data);
        else setError(data.error ?? "Failed to load event");
      })
      .catch(() => setError("Failed to load event"))
      .finally(() => setLoading(false));
  }, [id]);

  const handleAddWaypoint = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);
    try {
      const cutoffSec =
        form.waypoint_type === "cutoff" && form.cutoff_seconds_from_start
          ? parseCutoffInput(form.cutoff_seconds_from_start)
          : null;

      const distKm = form.distance_from_start_km ? Number(form.distance_from_start_km) : null;
      const lat = form.lat ? Number(form.lat) : null;
      const lng = form.lng ? Number(form.lng) : null;

      if (lat == null || lng == null) {
        alert("위도/경도를 입력해 주세요.");
        setAdding(false);
        return;
      }

      const res = await fetch(`/api/events/${id}/waypoints`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          waypoint_type: form.waypoint_type,
          lat,
          lng,
          elevation_m: form.elevation_m ? Number(form.elevation_m) : null,
          distance_from_start_km: distKm,
          cutoff_seconds_from_start: cutoffSec,
          supplies_available: form.supplies_available || null,
          is_mandatory_stop: form.is_mandatory_stop,
          memo: form.memo || null,
          order_index: (event?.waypoints.length ?? 0),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error ?? "Failed to add waypoint");
        return;
      }
      setEvent((prev) =>
        prev ? { ...prev, waypoints: [...prev.waypoints, data] } : prev,
      );
      setForm(EMPTY_WAYPOINT_FORM);
    } finally {
      setAdding(false);
    }
  };

  const startEdit = (wp: EventWaypointRow) => {
    setEditingId(wp.id);
    setEditForm(waypointToForm(wp));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm(EMPTY_WAYPOINT_FORM);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;

    const lat = editForm.lat ? Number(editForm.lat) : null;
    const lng = editForm.lng ? Number(editForm.lng) : null;
    if (lat == null || lng == null) {
      alert("위도/경도를 입력해 주세요.");
      return;
    }

    const cutoffSec =
      editForm.waypoint_type === "cutoff" && editForm.cutoff_seconds_from_start
        ? parseCutoffInput(editForm.cutoff_seconds_from_start)
        : null;

    setSavingEdit(true);
    try {
      const res = await fetch(`/api/events/${id}/waypoints/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editForm.name,
          waypoint_type: editForm.waypoint_type,
          lat,
          lng,
          elevation_m: editForm.elevation_m ? Number(editForm.elevation_m) : null,
          distance_from_start_km: editForm.distance_from_start_km
            ? Number(editForm.distance_from_start_km)
            : null,
          cutoff_seconds_from_start: cutoffSec,
          supplies_available: editForm.supplies_available || null,
          is_mandatory_stop: editForm.is_mandatory_stop,
          memo: editForm.memo || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error ?? "Failed to update waypoint");
        return;
      }
      setEvent((prev) =>
        prev
          ? { ...prev, waypoints: prev.waypoints.map((w) => (w.id === editingId ? data : w)) }
          : prev,
      );
      cancelEdit();
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteWaypoint = async (waypointId: string) => {
    if (!confirm("이 경유지를 삭제하시겠습니까?")) return;
    const res = await fetch(`/api/events/${id}/waypoints/${waypointId}`, { method: "DELETE" });
    if (res.ok) {
      setEvent((prev) =>
        prev ? { ...prev, waypoints: prev.waypoints.filter((w) => w.id !== waypointId) } : prev,
      );
    }
  };

  const waypointTypeColor: Record<WaypointType, string> = {
    start: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
    finish: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    checkpoint: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
    supply: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300",
    water: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300",
    cutoff: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
    summit: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
    rest: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  };

  if (loading) return <div className="p-8 text-sm text-gray-500">로딩 중...</div>;
  if (error) return <div className="p-8 text-sm text-red-500">{error}</div>;
  if (!event) return null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-2 flex items-center gap-3">
        <Link href="/events" className="text-gray-500 hover:text-gray-700 dark:text-zinc-400">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-zinc-100">{event.name}</h1>
      </div>
      <p className="mb-6 text-sm text-gray-500 dark:text-zinc-400">
        {event.event_date} · {event.official_distance_km ? `${event.official_distance_km}km` : ""}{" "}
        {event.official_elevation_m ? `/ ${event.official_elevation_m.toLocaleString()}m` : ""}
      </p>

      {/* 경유지 목록 */}
      <div className="mb-8">
        <h2 className="mb-3 text-base font-semibold text-gray-800 dark:text-zinc-200">
          경유지 ({event.waypoints.length}개)
        </h2>
        {event.waypoints.length === 0 ? (
          <p className="text-sm text-gray-400">등록된 경유지가 없습니다.</p>
        ) : (
          <ul className="space-y-2">
            {event.waypoints
              .slice()
              .sort((a, b) => a.order_index - b.order_index)
              .map((wp) =>
                editingId === wp.id ? (
                  <li
                    key={wp.id}
                    className="rounded-xl border border-blue-300 bg-white p-4 dark:border-blue-600 dark:bg-zinc-900"
                  >
                    <form onSubmit={handleSaveEdit}>
                      <WaypointFormFields form={editForm} setForm={setEditForm} />
                      <div className="mt-4 flex gap-2">
                        <button
                          type="submit"
                          disabled={savingEdit}
                          className="rounded-lg bg-[#5842F4] px-4 py-2 text-sm font-medium text-white hover:bg-[#4733d4] disabled:opacity-50"
                        >
                          {savingEdit ? "저장 중..." : "저장"}
                        </button>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                        >
                          취소
                        </button>
                      </div>
                    </form>
                  </li>
                ) : (
                  <li
                    key={wp.id}
                    className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900"
                  >
                    <GripVertical className="mt-0.5 h-4 w-4 shrink-0 text-gray-300 dark:text-zinc-600" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${waypointTypeColor[wp.waypoint_type]}`}>
                          {WAYPOINT_TYPE_LABELS[wp.waypoint_type]}
                        </span>
                        <span className="font-medium text-gray-900 dark:text-zinc-100">{wp.name}</span>
                        {wp.is_mandatory_stop && (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">필수</span>
                        )}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-3 text-xs text-gray-500 dark:text-zinc-400">
                        {wp.distance_from_start_km != null && <span>{wp.distance_from_start_km}km 지점</span>}
                        {wp.elevation_m != null && <span>{wp.elevation_m}m</span>}
                        {wp.cutoff_seconds_from_start != null && (
                          <span className="text-red-600 dark:text-red-400">
                            컷오프: {formatCutoff(wp.cutoff_seconds_from_start)}
                          </span>
                        )}
                        {wp.supplies_available && <span>물품: {wp.supplies_available}</span>}
                        {wp.memo && <span className="italic">{wp.memo}</span>}
                      </div>
                      {wp.lat != null && wp.lng != null && (
                        <div className="mt-0.5 text-xs text-gray-400 dark:text-zinc-500">
                          {wp.lat.toFixed(5)}, {wp.lng.toFixed(5)}
                        </div>
                      )}
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button
                        onClick={() => startEdit(wp)}
                        className="text-gray-400 hover:text-blue-500 dark:text-zinc-500"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteWaypoint(wp.id)}
                        className="text-gray-400 hover:text-red-500 dark:text-zinc-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </li>
                ),
              )}
          </ul>
        )}
      </div>

      {/* 경유지 추가 폼 */}
      <form
        onSubmit={handleAddWaypoint}
        className="rounded-xl border border-gray-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-900"
      >
        <h2 className="mb-4 text-base font-semibold text-gray-800 dark:text-zinc-200">경유지 추가</h2>
        <WaypointFormFields form={form} setForm={setForm} />
        <button
          type="submit"
          disabled={adding}
          className="mt-4 flex items-center gap-2 rounded-lg bg-[#5842F4] px-4 py-2 text-sm font-medium text-white hover:bg-[#4733d4] disabled:opacity-50"
        >
          <PlusCircle className="h-4 w-4" />
          {adding ? "추가 중..." : "경유지 추가"}
        </button>
      </form>
    </div>
  );
}
