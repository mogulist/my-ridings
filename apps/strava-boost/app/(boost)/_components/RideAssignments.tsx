"use client";

import { Check, ChevronRight, Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { assignmentFor, bikeChoices, type Garage, isRide, preferredBikeId } from "@/lib/equipment";
import type { StravaActivity } from "@/types/strava";
import { localDateTime } from "../_lib/local-date-time";
import { assignPresetToRides } from "../_lib/ride-assignment";
import { type RideDateRange, rideCalendarDate, rideIsInDateRange } from "../_lib/ride-date-range";
import { orderedBikePresets, sameConfiguration } from "../_lib/workbench-preset";
import { ConfigurationSummary } from "./ConfigurationSummary";
import { RideDateRangeFilter } from "./RideDateRangeFilter";

type RideAssignmentsProps = {
	garage: Garage;
	activities: StravaActivity[];
	initialActivityId: number | null;
	initialPresetId: string | null;
	save: (garage: Garage) => Promise<boolean>;
	busy: boolean;
	demo: boolean;
	manageBike: (bikeId: string) => void;
	sync: () => void;
};

export function RideAssignments({
	garage,
	activities,
	initialActivityId,
	initialPresetId,
	save,
	busy,
	demo,
	manageBike,
	sync,
}: RideAssignmentsProps) {
	const initialPreset = garage.presets.find((preset) => preset.id === initialPresetId);
	const initialActivity = activities.find((activity) => activity.id === initialActivityId);
	const initialAssignment = initialActivity ? assignmentFor(garage, initialActivity) : null;
	const [bikeId, setBikeId] = useState(
		() => initialPreset?.bikeId ?? initialAssignment?.bikeId ?? preferredBikeId(garage, activities),
	);
	const [presetId, setPresetId] = useState(
		() =>
			initialPreset?.id ??
			garage.presets.find(
				(preset) =>
					preset.bikeId === (initialAssignment?.bikeId ?? preferredBikeId(garage, activities)) &&
					(!initialAssignment || sameConfiguration(preset.parts, initialAssignment.parts)),
			)?.id ??
			"",
	);
	const [selectedIds, setSelectedIds] = useState<number[]>(() =>
		initialActivityId ? [initialActivityId] : [],
	);
	const [query, setQuery] = useState("");
	const [bikeFilter, setBikeFilter] = useState("");
	const [unassignedOnly, setUnassignedOnly] = useState(false);
	const [dateRange, setDateRange] = useState<RideDateRange | null>(null);
	const [visibleCount, setVisibleCount] = useState(50);
	const [error, setError] = useState("");
	const rides = activities
		.filter(isRide)
		.sort((a, b) => Date.parse(b.start_date) - Date.parse(a.start_date));
	const choices = bikeChoices(garage, activities);
	// Build indexes once per render rather than scanning all assignments for every row.
	const assignments = new Map(
		garage.assignments.map((assignment) => [assignment.activityId, assignment]),
	);
	const gearBikes = new Map(
		garage.bikes.filter((bike) => bike.stravaGearId).map((bike) => [bike.stravaGearId, bike.id]),
	);
	const rideBikeId = (ride: StravaActivity) =>
		assignments.get(ride.id)?.bikeId ?? gearBikes.get(ride.gear_id);
	const filtered = rides.filter(
		(ride) =>
			ride.name.toLocaleLowerCase().includes(query.toLocaleLowerCase()) &&
			(!bikeFilter || rideBikeId(ride) === bikeFilter) &&
			(!unassignedOnly || !assignments.has(ride.id)) &&
			rideIsInDateRange(ride, dateRange),
	);
	const filteredIds = new Set(filtered.map((ride) => ride.id));
	// Pending-only batches must never include already assigned or hidden rides.
	const selected = rides.filter(
		(ride) => selectedIds.includes(ride.id) && (!unassignedOnly || filteredIds.has(ride.id)),
	);
	const presets = orderedBikePresets(
		garage.presets,
		bikeId,
		localDateTime(new Date()).slice(0, 10),
	);
	const preset = presets.find((item) => item.id === presetId) ?? presets[0];
	const needsAssignment =
		preset &&
		selected.some((ride) => {
			const current = assignments.get(ride.id);
			return (
				!current || current.bikeId !== bikeId || !sameConfiguration(current.parts, preset.parts)
			);
		});
	const allFilteredSelected =
		filtered.length > 0 && filtered.every((ride) => selectedIds.includes(ride.id));

	async function assign() {
		if (!preset || busy) return;
		setError("");
		try {
			if (await save(assignPresetToRides(garage, selected, preset))) {
				if (unassignedOnly) setSelectedIds([]);
			}
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : "조합을 배정하지 못했습니다.");
		}
	}

	return (
		<>
			<div className="boost-page-title">
				<h1>라이딩에 조합 배정</h1>
			</div>
			<div className="boost-assignment-layout">
				<section className="boost-assignment-list" aria-label="라이딩 목록">
					<div className="boost-assignment-filters">
						<label className="boost-field">
							<span>
								<Search size={14} /> 라이딩 검색
							</span>
							<input
								type="search"
								value={query}
								onChange={(event) => {
									setQuery(event.target.value);
									setVisibleCount(50);
								}}
								placeholder="라이딩 이름으로 검색"
							/>
						</label>
						<label className="boost-field">
							자전거별 라이딩
							<select
								value={bikeFilter}
								onChange={(event) => {
									setBikeFilter(event.target.value);
									setVisibleCount(50);
								}}
							>
								<option value="">모든 자전거</option>
								{[...choices.current, ...choices.retired].map((bike) => (
									<option key={bike.id} value={bike.id}>
										{bike.name}
										{bike.usedUntil ? " · 사용 종료" : ""}
									</option>
								))}
							</select>
						</label>
						<RideDateRangeFilter
							value={dateRange}
							disabled={busy}
							earliestDate={rides.length ? rideCalendarDate(rides[rides.length - 1]) : undefined}
							latestDate={rides.length ? rideCalendarDate(rides[0]) : undefined}
							onChange={(value) => {
								setDateRange(value);
								setSelectedIds([]);
								setVisibleCount(50);
							}}
						/>
						<label className="boost-unassigned-filter">
							<input
								type="checkbox"
								checked={unassignedOnly}
								disabled={busy}
								onChange={(event) => {
									setUnassignedOnly(event.target.checked);
									setSelectedIds([]);
									setVisibleCount(50);
								}}
							/>
							조합 배정 전만
						</label>
					</div>
					<div className="boost-ride-selection">
						<label>
							<input
								type="checkbox"
								disabled={busy || !filtered.length}
								checked={allFilteredSelected}
								onChange={(event) =>
									setSelectedIds((previous) =>
										event.target.checked
											? [...new Set([...previous, ...filtered.map((ride) => ride.id)])]
											: previous.filter((id) => !filtered.some((ride) => ride.id === id)),
									)
								}
							/>
							검색 결과 {filtered.length}개 전체 선택
						</label>
						<button
							type="button"
							className="boost-text"
							disabled={busy || !selected.length}
							onClick={() => setSelectedIds([])}
						>
							선택 해제
						</button>
					</div>
					{filtered.slice(0, visibleCount).map((ride) => {
						const assignment = assignments.get(ride.id);
						const matched =
							assignment &&
							garage.presets.find(
								(item) =>
									item.bikeId === assignment.bikeId &&
									sameConfiguration(item.parts, assignment.parts),
							);
						const currentBike = garage.bikes.find((bike) => bike.id === rideBikeId(ride));
						return (
							<div
								className={`boost-assignment-ride ${selectedIds.includes(ride.id) ? "is-selected" : ""}`}
								key={ride.id}
							>
								<input
									type="checkbox"
									aria-label={`${ride.name} 선택`}
									disabled={busy}
									checked={selectedIds.includes(ride.id)}
									onChange={() =>
										setSelectedIds((previous) =>
											previous.includes(ride.id)
												? previous.filter((id) => id !== ride.id)
												: [...previous, ride.id],
										)
									}
								/>
								<button
									type="button"
									className="boost-assignment-ride-body"
									disabled={busy}
									onClick={() => setSelectedIds([ride.id])}
								>
									<small>
										{new Date(ride.start_date).toLocaleDateString("ko-KR")}
										<span>{(ride.distance / 1000).toFixed(1)} km</span>
									</small>
									<strong>{ride.name}</strong>
									<span className="boost-ride-equipment">
										<span>{currentBike?.name ?? "자전거 미지정"}</span>
										<span aria-hidden="true"> · </span>
										<span
											className={assignment ? "boost-assigned-label" : "boost-unassigned-label"}
										>
											{matched?.name ?? (assignment ? "개별 부품 구성" : "조합 배정 전")}
										</span>
									</span>
								</button>
								{!demo && (
									<Link
										href={`/activity/${ride.id}`}
										aria-label={`${ride.name} 상세 보기`}
										className="boost-text"
									>
										<ChevronRight size={18} />
									</Link>
								)}
							</div>
						);
					})}
					{filtered.length > visibleCount && (
						<button
							type="button"
							className="boost-text boost-more-rides"
							onClick={() => setVisibleCount((count) => count + 50)}
						>
							라이딩 50개 더 보기
						</button>
					)}
					{!filtered.length && (
						<div className="boost-empty-small">
							{rides.length ? (
								"검색 조건에 맞는 라이딩이 없습니다."
							) : (
								<>
									<p>아직 동기화한 라이딩이 없습니다.</p>
									<button type="button" className="boost-text" disabled={busy} onClick={sync}>
										라이딩 가져오기
									</button>
								</>
							)}
						</div>
					)}
				</section>
				<section className="boost-assignment-target" aria-label="라이딩에 배정할 조합">
					<h2>배정할 조합</h2>
					<label className="boost-field">
						자전거
						<select
							value={bikeId}
							disabled={busy}
							onChange={(event) => {
								setBikeId(event.target.value);
								setPresetId("");
								setError("");
							}}
						>
							<option value="" disabled>
								자전거 선택
							</option>
							{[...choices.current, ...choices.retired].map((bike) => (
								<option key={bike.id} value={bike.id}>
									{bike.name}
									{bike.usedUntil ? " · 사용 종료" : ""}
								</option>
							))}
						</select>
					</label>
					<fieldset className="boost-preset-list" aria-label="배정할 조합 선택">
						{presets.map((item) => (
							<button
								type="button"
								key={item.id}
								className="boost-preset-chip"
								aria-pressed={item.id === preset?.id}
								disabled={busy}
								onClick={() => {
									setPresetId(item.id);
									setError("");
								}}
							>
								{item.id === preset?.id && <Check size={14} />} {item.name}
							</button>
						))}
					</fieldset>
					{preset ? (
						<ConfigurationSummary garage={garage} parts={preset.parts} />
					) : (
						<p className="boost-empty-small">저장된 조합이 없습니다.</p>
					)}
					<button
						type="button"
						className="boost-text"
						disabled={!bikeId || busy}
						onClick={() => manageBike(bikeId)}
					>
						내 장비에서 조합 관리 <ChevronRight size={15} />
					</button>
					<div className="boost-assignment-footer">
						<p className="boost-muted" aria-live="polite">
							{selected.length
								? `${selected.length}개 라이딩 선택${needsAssignment ? "" : " · 이미 같은 조합이 배정되어 있습니다."}`
								: "왼쪽에서 배정할 라이딩을 선택하세요."}
						</p>
						{error && (
							<p role="alert" className="boost-error">
								{error}
							</p>
						)}
						<button
							type="button"
							className="boost-primary"
							disabled={busy || !needsAssignment}
							onClick={assign}
						>
							{busy
								? "저장 중…"
								: selected.length
									? `${selected.length}개 라이딩에 배정`
									: "라이딩 선택 후 배정"}
						</button>
					</div>
				</section>
			</div>
		</>
	);
}
