"use client";

import { BedDouble, ChevronLeft, MapPin, Store } from "lucide-react";

export type StageEndCandidate = {
	id: string;
	label: string;
	distanceFromStageStartKm: number;
	absoluteDistanceKm: number;
	elevationGainM: number;
	accommodationCount: number;
	convenienceCount: number;
};

type StageEndExplorerPaneProps = {
	dayNumber: number;
	stageStartKm: number;
	totalRouteDistanceKm: number;
	minDistanceKm: number;
	maxDistanceKm: number;
	maxSelectableDistanceKm: number;
	candidates: StageEndCandidate[];
	selectedCandidateId: string | null;
	onRangeChange: (range: { minDistanceKm: number; maxDistanceKm: number }) => void;
	onCandidateSelect: (candidate: StageEndCandidate) => void;
	onClose: () => void;
};

const RANGE_STEP_KM = 5;

function clamp(value: number, min: number, max: number) {
	return Math.min(max, Math.max(min, value));
}

export function StageEndExplorerPane({
	dayNumber,
	stageStartKm,
	totalRouteDistanceKm,
	minDistanceKm,
	maxDistanceKm,
	maxSelectableDistanceKm,
	candidates,
	selectedCandidateId,
	onRangeChange,
	onCandidateSelect,
	onClose,
}: StageEndExplorerPaneProps) {
	const rangeLimit = Math.max(
		RANGE_STEP_KM,
		Math.floor(maxSelectableDistanceKm / RANGE_STEP_KM) * RANGE_STEP_KM,
	);
	const selectedStartKm = stageStartKm + minDistanceKm;
	const selectedEndKm = stageStartKm + maxDistanceKm;
	const overviewStartPct = totalRouteDistanceKm
		? (selectedStartKm / totalRouteDistanceKm) * 100
		: 0;
	const overviewWidthPct = totalRouteDistanceKm
		? ((selectedEndKm - selectedStartKm) / totalRouteDistanceKm) * 100
		: 0;
	const rangeStartPct = (minDistanceKm / rangeLimit) * 100;
	const rangeWidthPct = ((maxDistanceKm - minDistanceKm) / rangeLimit) * 100;

	const updateMin = (next: number) => {
		onRangeChange({
			minDistanceKm: clamp(next, 0, Math.max(0, maxDistanceKm - RANGE_STEP_KM)),
			maxDistanceKm,
		});
	};

	const updateMax = (next: number) => {
		onRangeChange({
			minDistanceKm,
			maxDistanceKm: clamp(next, minDistanceKm + RANGE_STEP_KM, rangeLimit),
		});
	};

	const shiftRange = (deltaKm: number) => {
		const width = maxDistanceKm - minDistanceKm;
		const nextMin = clamp(minDistanceKm + deltaKm, 0, Math.max(0, rangeLimit - width));
		onRangeChange({ minDistanceKm: nextMin, maxDistanceKm: nextMin + width });
	};

	return (
		<div className="flex h-full w-80 shrink-0 flex-col overflow-hidden border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
			<header className="shrink-0 border-b border-zinc-200 px-4 pb-3 pt-3 dark:border-zinc-800">
				<button
					type="button"
					onClick={onClose}
					className="mb-3 inline-flex items-center gap-1 text-xs font-medium text-zinc-500 hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 dark:text-zinc-400 dark:hover:text-zinc-100"
				>
					<ChevronLeft className="size-3.5" />
					스테이지 목록
				</button>
				<div className="flex items-start justify-between gap-3">
					<div>
						<h2 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">
							{dayNumber}일차 종료 지점 탐색
						</h2>
						<p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
							경로 {stageStartKm.toFixed(0)}km 지점에서 출발
						</p>
					</div>
					<span className="rounded-full bg-orange-100 px-2 py-1 text-[11px] font-semibold text-orange-700 dark:bg-orange-950 dark:text-orange-300">
						UI 미리보기
					</span>
				</div>
			</header>

			<div className="min-h-0 flex-1 overflow-y-auto">
				<section className="border-b border-zinc-200 px-4 py-4 dark:border-zinc-800">
					<div className="flex items-baseline justify-between">
						<h3 className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
							탐색할 하루 거리
						</h3>
						<span className="text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
							누적 {selectedStartKm.toFixed(0)}–{selectedEndKm.toFixed(0)}km
						</span>
					</div>

					<div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-end gap-2">
						<label className="text-[11px] text-zinc-500 dark:text-zinc-400">
							최소
							<div className="mt-1 flex items-center rounded-md border border-zinc-300 bg-white px-2 dark:border-zinc-700 dark:bg-zinc-950">
								<input
									type="number"
									min={0}
									max={Math.max(0, maxDistanceKm - RANGE_STEP_KM)}
									step={RANGE_STEP_KM}
									value={minDistanceKm}
									onChange={(event) => updateMin(Number(event.target.value))}
									className="min-w-0 flex-1 bg-transparent py-2 text-right text-sm font-semibold tabular-nums text-zinc-900 outline-none dark:text-zinc-100"
								/>
								<span className="ml-1 text-xs text-zinc-400">km</span>
							</div>
						</label>
						<span className="pb-2.5 text-zinc-300 dark:text-zinc-700">–</span>
						<label className="text-[11px] text-zinc-500 dark:text-zinc-400">
							최대
							<div className="mt-1 flex items-center rounded-md border border-zinc-300 bg-white px-2 dark:border-zinc-700 dark:bg-zinc-950">
								<input
									type="number"
									min={minDistanceKm + RANGE_STEP_KM}
									max={rangeLimit}
									step={RANGE_STEP_KM}
									value={maxDistanceKm}
									onChange={(event) => updateMax(Number(event.target.value))}
									className="min-w-0 flex-1 bg-transparent py-2 text-right text-sm font-semibold tabular-nums text-zinc-900 outline-none dark:text-zinc-100"
								/>
								<span className="ml-1 text-xs text-zinc-400">km</span>
							</div>
						</label>
					</div>

					<div className="relative mt-5 h-7">
						<div className="absolute inset-x-0 top-3 h-1 rounded-full bg-zinc-200 dark:bg-zinc-700" />
						<div
							className="absolute top-3 h-1 rounded-full bg-orange-500"
							style={{ left: `${rangeStartPct}%`, width: `${rangeWidthPct}%` }}
						/>
						<input
							type="range"
							aria-label="탐색 최소 거리"
							min={0}
							max={rangeLimit}
							step={RANGE_STEP_KM}
							value={minDistanceKm}
							onChange={(event) => updateMin(Number(event.target.value))}
							className="stage-explorer-range absolute inset-x-0 top-0 z-20 w-full"
						/>
						<input
							type="range"
							aria-label="탐색 최대 거리"
							min={0}
							max={rangeLimit}
							step={RANGE_STEP_KM}
							value={maxDistanceKm}
							onChange={(event) => updateMax(Number(event.target.value))}
							className="stage-explorer-range absolute inset-x-0 top-0 z-10 w-full"
						/>
					</div>

					<div className="mt-1 grid grid-cols-2 gap-2">
						<button
							type="button"
							onClick={() => shiftRange(-50)}
							disabled={minDistanceKm <= 0}
							className="rounded-md border border-zinc-200 px-2 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 disabled:opacity-35 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
						>
							−50km 이동
						</button>
						<button
							type="button"
							onClick={() => shiftRange(50)}
							disabled={maxDistanceKm >= rangeLimit}
							className="rounded-md border border-zinc-200 px-2 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 disabled:opacity-35 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
						>
							+50km 이동
						</button>
					</div>

					<div className="mt-5">
						<div className="mb-1.5 flex justify-between text-[10px] tabular-nums text-zinc-400">
							<span>0km</span>
							<span>전체 {totalRouteDistanceKm.toFixed(0)}km</span>
						</div>
						<div className="relative h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
							<div
								className="absolute inset-y-0 rounded-full bg-orange-500"
								style={{
									left: `${overviewStartPct}%`,
									width: `${Math.max(0.8, overviewWidthPct)}%`,
								}}
							/>
						</div>
						<p className="mt-2 text-[11px] leading-4 text-zinc-500 dark:text-zinc-400">
							지도와 고도 프로필은 이 구간만 확대합니다.
						</p>
					</div>
				</section>

				<section className="border-b border-zinc-200 px-4 py-4 dark:border-zinc-800">
					<h3 className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">찾을 장소</h3>
					<div className="mt-2 flex gap-2">
						<span className="inline-flex items-center gap-1.5 rounded-md bg-blue-50 px-2.5 py-2 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:ring-blue-900">
							<BedDouble className="size-3.5" /> 숙소
						</span>
						<span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2.5 py-2 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:ring-emerald-900">
							<Store className="size-3.5" /> 편의점
						</span>
					</div>
					<button
						type="button"
						disabled
						className="mt-3 w-full rounded-md bg-zinc-200 px-3 py-2.5 text-sm font-semibold text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
					>
						1B에서 실제 장소를 찾습니다
					</button>
				</section>

				<section className="px-4 py-4">
					<div className="flex items-baseline justify-between">
						<h3 className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
							종료 지점 비교
						</h3>
						<span className="text-[11px] text-zinc-400">예시 후보</span>
					</div>
					<div className="mt-2 overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-700">
						{candidates.map((candidate) => {
							const selected = candidate.id === selectedCandidateId;
							return (
								<button
									type="button"
									key={candidate.id}
									onClick={() => onCandidateSelect(candidate)}
									className={`flex w-full gap-3 border-b border-zinc-200 px-3 py-3 text-left last:border-b-0 focus-visible:relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-orange-500 dark:border-zinc-700 ${
										selected
											? "bg-orange-50 dark:bg-orange-950/30"
											: "bg-white hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800"
									}`}
								>
									<span
										className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
											selected
												? "bg-orange-500 text-white"
												: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
										}`}
									>
										{candidate.label}
									</span>
									<span className="min-w-0 flex-1">
										<span className="flex items-center justify-between gap-2">
											<span className="font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
												{candidate.distanceFromStageStartKm.toFixed(0)}km
											</span>
											<MapPin className="size-3.5 text-zinc-400" />
										</span>
										<span className="mt-0.5 block text-[11px] tabular-nums text-zinc-500 dark:text-zinc-400">
											누적 {candidate.absoluteDistanceKm.toFixed(0)}km · 상승{" "}
											{candidate.elevationGainM.toLocaleString("ko-KR")}m
										</span>
										<span className="mt-1 block text-[11px] text-zinc-400">
											숙소·편의점 수는 실제 검색 단계에서 표시
										</span>
									</span>
								</button>
							);
						})}
					</div>
				</section>
			</div>
		</div>
	);
}
