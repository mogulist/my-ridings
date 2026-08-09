"use client";

import { useCallback, useEffect, useId, useState } from "react";
import type { RouteOfficialSpecs } from "@/app/types/route";

export type RouteOfficialSpecsSavePayload = {
	official_distance_km: number | null;
	official_elevation_m: number | null;
	official_start_name: string | null;
	official_finish_name: string | null;
};

type RouteOfficialSpecsDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	initialSpecs: RouteOfficialSpecs;
	rwgpsDistanceKm: number | null;
	rwgpsElevationGainM: number | null;
	onSave: (payload: RouteOfficialSpecsSavePayload) => Promise<void>;
};

function toInputNumber(value: number | null): string {
	return value != null && Number.isFinite(value) ? String(value) : "";
}

export function RouteOfficialSpecsDialog({
	open,
	onOpenChange,
	initialSpecs,
	rwgpsDistanceKm,
	rwgpsElevationGainM,
	onSave,
}: RouteOfficialSpecsDialogProps) {
	const baseId = useId();
	const [distanceKm, setDistanceKm] = useState("");
	const [elevationM, setElevationM] = useState("");
	const [startName, setStartName] = useState("");
	const [finishName, setFinishName] = useState("");
	const [isSaving, setIsSaving] = useState(false);

	useEffect(() => {
		if (!open) return;
		setDistanceKm(toInputNumber(initialSpecs.officialDistanceKm));
		setElevationM(toInputNumber(initialSpecs.officialElevationM));
		setStartName(initialSpecs.officialStartName ?? "");
		setFinishName(initialSpecs.officialFinishName ?? "");
	}, [open, initialSpecs]);

	const handleClose = useCallback(() => {
		if (isSaving) return;
		onOpenChange(false);
	}, [isSaving, onOpenChange]);

	useEffect(() => {
		if (!open) return;
		const onKey = (event: KeyboardEvent) => {
			if (event.key === "Escape") handleClose();
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [open, handleClose]);

	const handleSave = useCallback(async () => {
		if (isSaving) return;
		setIsSaving(true);
		try {
			const parsedDistance = parseOptionalPositiveNumber(distanceKm);
			const parsedElevation = parseOptionalPositiveInteger(elevationM);
			await onSave({
				official_distance_km: parsedDistance,
				official_elevation_m: parsedElevation,
				official_start_name: startName.trim() || null,
				official_finish_name: finishName.trim() || null,
			});
			onOpenChange(false);
		} finally {
			setIsSaving(false);
		}
	}, [
		isSaving,
		distanceKm,
		elevationM,
		startName,
		finishName,
		onSave,
		onOpenChange,
	]);

	if (!open) return null;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
			<div
				role="dialog"
				aria-modal
				aria-labelledby={`${baseId}-title`}
				className="mx-auto w-full max-w-md rounded-xl border border-zinc-200 bg-white p-5 shadow-2xl dark:border-zinc-700 dark:bg-zinc-900"
			>
				<h3
					id={`${baseId}-title`}
					className="text-sm font-semibold text-zinc-900 dark:text-zinc-100"
				>
					공식 코스 스펙
				</h3>
				<p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
					대회 주최측·라우트 설계자가 발표한 거리·획득고도·출발·도착을 입력합니다. 브리핑
					영상에서 공식 수치로 표시할 수 있습니다.
				</p>
				{rwgpsDistanceKm != null || rwgpsElevationGainM != null ? (
					<p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
						RideWithGPS:{" "}
						{rwgpsDistanceKm != null ? `${rwgpsDistanceKm.toLocaleString("ko-KR")} km` : "—"}
						{rwgpsElevationGainM != null
							? ` · ↑${rwgpsElevationGainM.toLocaleString("ko-KR")} m`
							: ""}
					</p>
				) : null}
				<div className="mt-4 flex flex-col gap-3">
					<label className="block">
						<span className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
							공식 거리 (km)
						</span>
						<input
							type="text"
							inputMode="decimal"
							className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500"
							placeholder="예: 209"
							value={distanceKm}
							onChange={(event) => setDistanceKm(event.target.value)}
						/>
					</label>
					<label className="block">
						<span className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
							공식 획득고도 (m)
						</span>
						<input
							type="text"
							inputMode="numeric"
							className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500"
							placeholder="예: 2099"
							value={elevationM}
							onChange={(event) => setElevationM(event.target.value)}
						/>
					</label>
					<label className="block">
						<span className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
							출발지 이름
						</span>
						<input
							type="text"
							className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500"
							placeholder="예: Start"
							value={startName}
							onChange={(event) => setStartName(event.target.value)}
						/>
					</label>
					<label className="block">
						<span className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
							도착지 이름
						</span>
						<input
							type="text"
							className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500"
							placeholder="예: Finish"
							value={finishName}
							onChange={(event) => setFinishName(event.target.value)}
						/>
					</label>
				</div>
				<div className="mt-5 flex justify-end gap-2">
					<button
						type="button"
						onClick={handleClose}
						disabled={isSaving}
						className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-400 dark:hover:bg-zinc-800"
					>
						취소
					</button>
					<button
						type="button"
						onClick={() => void handleSave()}
						disabled={isSaving}
						className="rounded-md bg-zinc-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
					>
						{isSaving ? "저장 중…" : "저장"}
					</button>
				</div>
			</div>
		</div>
	);
}

function parseOptionalPositiveNumber(raw: string): number | null {
	const trimmed = raw.trim();
	if (!trimmed) return null;
	const n = Number(trimmed);
	if (!Number.isFinite(n) || n <= 0) return null;
	return n;
}

function parseOptionalPositiveInteger(raw: string): number | null {
	const n = parseOptionalPositiveNumber(raw);
	if (n == null) return null;
	return Math.round(n);
}
