"use client";
import { GripVertical, X } from "lucide-react";
import { useEffect, useState } from "react";
import {
	assignmentFor,
	type Configuration,
	configurationAt,
	type Garage,
	kindLabels,
	type PartKind,
	partDistance,
	type Slot,
	slots,
	validateConfiguration,
} from "@/lib/equipment";
import type { StravaActivity } from "@/types/strava";
import { localDateTime } from "../_lib/local-date-time";
import { Modal } from "./Modal";
import { PartIcon } from "./PartIcon";

export function Workbench({
	garage,
	activities,
	activity,
	bikeId,
	save,
	busy,
	editPart,
	onDirty,
}: {
	garage: Garage;
	activities: StravaActivity[];
	activity: StravaActivity | null;
	bikeId: string;
	save: (garage: Garage) => Promise<boolean>;
	busy: boolean;
	editPart: (id: string) => void;
	onDirty: (dirty: boolean) => void;
}) {
	const [draft, setDraft] = useState<Configuration>({});
	const [slot, setSlot] = useState<Slot>("wheelset");
	const [category, setCategory] = useState<PartKind>("wheelset");
	const [over, setOver] = useState<Slot | null>(null);
	const [message, setMessage] = useState("");
	const [dirty, setDirty] = useState(false);
	const [presetName, setPresetName] = useState<string | null>(null);
	const [expanded, setExpanded] = useState(false);
	const [picking, setPicking] = useState(false);
	const [effective, setEffective] = useState(localDateTime(new Date()));
	useEffect(() => {
		const assigned = activity ? assignmentFor(garage, activity) : null;
		setDraft({
			...(assigned?.bikeId === bikeId
				? assigned.parts
				: configurationAt(garage, bikeId, activity?.start_date ?? new Date().toISOString())),
		});
		setDirty(false);
		setMessage("");
	}, [garage.installations, garage.assignments, bikeId, activity]);
	useEffect(() => {
		onDirty(dirty);
	}, [dirty, onDirty]);
	const at =
		activity?.start_date ??
		(effective ? new Date(effective).toISOString() : new Date().toISOString());
	const available = garage.parts.filter(
		(p) =>
			p.kind === category &&
			Date.parse(p.startedAt) <= Date.parse(at) &&
			(!p.retiredAt || Date.parse(p.retiredAt) > Date.parse(at)),
	);
	function select(id: string, target: Slot) {
		if (busy) return;
		const next = { ...draft, [target]: id };
		try {
			validateConfiguration(garage, next, at);
			setDraft(next);
			setDirty(true);
			setPicking(false);
			setMessage(`${slots[target].label}에 ${garage.parts.find((p) => p.id === id)?.name} 선택`);
		} catch (error) {
			setMessage(error instanceof Error ? error.message : "부품을 선택하지 못했습니다.");
		}
	}
	async function apply() {
		try {
			validateConfiguration(garage, draft, at);
			if (activity) {
				const next = {
					...garage,
					assignments: [
						...garage.assignments.filter((a) => a.activityId !== activity.id),
						{ activityId: activity.id, bikeId, parts: { ...draft } },
					],
				};
				if (await save(next)) {
					setDirty(false);
					setMessage("이 라이딩의 부품 조합을 저장했습니다.");
				}
			} else {
				if (Date.parse(at) > Date.now()) throw new Error("장착 일시는 미래로 지정할 수 없습니다.");
				const timestamp = effective === localDateTime(new Date()) ? new Date().toISOString() : at;
				const next = {
					...garage,
					installations: [
						...garage.installations,
						{ id: crypto.randomUUID(), bikeId, at: timestamp, parts: { ...draft } },
					],
				};
				if (await save(next)) {
					setDirty(false);
					setMessage("장착 이력을 저장했습니다.");
				}
			}
		} catch (error) {
			setMessage(error instanceof Error ? error.message : "조합을 확인해 주세요.");
		}
	}
	const library = (
		<>
			<div className="boost-section-head">
				<h2>부품 보관함</h2>
				<GripVertical size={18} aria-hidden="true" />
			</div>
			<p className="boost-muted">부품을 끌어 놓거나 눌러서 선택하세요.</p>
			<div className="boost-categories">
				{(Object.keys(kindLabels) as PartKind[]).map((kind) => (
					<button
						type="button"
						className="boost-chip"
						key={kind}
						aria-pressed={kind === category}
						onClick={() => {
							setCategory(kind);
							if (kind === "cassette" || kind === "brake") setExpanded(true);
							if (slots[slot].kind !== kind)
								setSlot((Object.keys(slots) as Slot[]).find((s) => slots[s].kind === kind)!);
						}}
					>
						{kindLabels[kind]}
					</button>
				))}
			</div>
			<p className="boost-selected-target">
				선택 위치: <strong>{slots[slot].label}</strong>
			</p>
			{available.map((p) => (
				<div key={p.id} className="boost-part-row">
					<button
						type="button"
						className="boost-part"
						draggable
						onDragStart={(e) => {
							e.dataTransfer.setData("application/x-boost-part", p.id);
							e.dataTransfer.effectAllowed = "copy";
						}}
						aria-pressed={Object.values(draft).includes(p.id)}
						onClick={() => select(p.id, slot)}
					>
						<span className="boost-part-figure">
							<PartIcon kind={p.kind} size={26} />
						</span>
						<span>
							<strong>{p.name}</strong>
							<small>
								{new Date(p.startedAt).toLocaleDateString("ko-KR")}부터 ·{" "}
								{partDistance(garage, activities, p.id).toLocaleString("ko-KR", {
									maximumFractionDigits: 1,
								})}
								km
							</small>
						</span>
						<GripVertical size={16} className="boost-grip" aria-hidden="true" />
					</button>
					<button
						type="button"
						className="boost-part-detail"
						aria-label={`${p.name} 상세 정보`}
						onClick={() => {
							setPicking(false);
							editPart(p.id);
						}}
					>
						상세
					</button>
				</div>
			))}
			{!available.length && (
				<div className="boost-empty-small">
					이 날짜에 사용할 수 있는 {kindLabels[category]}가 없습니다. 부품을 등록하거나 사용
					시작일을 확인해 주세요.
				</div>
			)}
			<p className="boost-library-foot">
				같은 모델도 각각의 사용 이력을 추적합니다. 타이어는 앞·뒤 위치에 하나씩 배정합니다.
			</p>
		</>
	);
	return (
		<>
			<div className="boost-context">
				<span>
					{activity ? (
						<>
							<strong>{activity.name}</strong>
							<b>{(activity.distance / 1000).toFixed(1)}km</b>
						</>
					) : (
						"현재 장착 상태"
					)}
				</span>
				<span>
					{activity
						? new Date(activity.start_date).toLocaleDateString("ko-KR")
						: "변경한 시점부터 사용 거리에 반영됩니다"}
				</span>
			</div>
			<div className="boost-workspace">
				<section className="boost-build" aria-label="부품 조합 작업대">
					<div className="boost-section-head">
						<h2>{garage.bikes.find((b) => b.id === bikeId)?.name}</h2>
						<span className="boost-muted">{activity ? "이 라이딩의 사용 부품" : "장착 부품"}</span>
					</div>
					<div className="boost-slots">
						{(Object.entries(slots) as [Slot, (typeof slots)[Slot]][])
							.filter(
								([key]) =>
									expanded ||
									["wheelset", "tire_front", "tire_rear", "chain"].includes(key) ||
									draft[key],
							)
							.map(([key, definition]) => {
								const part = garage.parts.find((p) => p.id === draft[key]);
								return (
									<div
										key={key}
										className={`boost-slot ${key === slot ? "is-active" : ""} ${over === key ? "is-over" : ""} ${key === "wheelset" || key === "chain" || key === "cassette" ? "is-wide" : ""}`}
										onDragOver={(e) => {
											e.preventDefault();
											setOver(key);
										}}
										onDragLeave={() => setOver(null)}
										onDrop={(e) => {
											e.preventDefault();
											setOver(null);
											select(e.dataTransfer.getData("application/x-boost-part"), key);
										}}
									>
										<button
											type="button"
											className="boost-slot-select"
											aria-pressed={key === slot}
											onClick={() => {
												setSlot(key);
												setCategory(definition.kind);
												if (window.matchMedia("(max-width: 720px)").matches) setPicking(true);
												setMessage(`${definition.label}에 사용할 부품을 보관함에서 선택하세요`);
											}}
										>
											<span className="boost-slot-label">
												<PartIcon kind={definition.kind} size={16} />
												{definition.label}
											</span>
											<strong>{part?.name ?? "부품 선택"}</strong>
											<small>
												{part
													? `누적 ${partDistance(garage, activities, part.id).toLocaleString("ko-KR", { maximumFractionDigits: 1 })}km`
													: "보관함에서 끌어 놓거나 눌러 선택"}
											</small>
										</button>
										{part && (
											<button
												type="button"
												disabled={busy}
												className="boost-remove"
												aria-label={`${definition.label} 분리`}
												onClick={() => {
													const next = { ...draft };
													delete next[key];
													setDraft(next);
													setDirty(true);
												}}
											>
												<X size={14} />
											</button>
										)}
									</div>
								);
							})}
					</div>
					<button
						type="button"
						className="boost-text"
						aria-expanded={expanded}
						onClick={() => setExpanded((v) => !v)}
					>
						{expanded ? "추가 부품 접기" : "스프라켓·브레이크 펼치기"}
					</button>
					<div className="boost-presets">
						<span>빠른 조합</span>
						{garage.presets
							.filter((p) => p.bikeId === bikeId)
							.map((p) => (
								<button
									type="button"
									className="boost-chip"
									key={p.id}
									disabled={busy}
									onClick={() => {
										setDraft({ ...p.parts });
										setDirty(true);
										setMessage(`${p.name} 조합을 불러왔습니다. 적용 전 확인해 주세요.`);
									}}
								>
									{p.name}
								</button>
							))}
						<button
							type="button"
							className="boost-text"
							disabled={busy || !Object.keys(draft).length}
							onClick={() => setPresetName("")}
						>
							조합 저장
						</button>
					</div>
					{!activity && (
						<label className="boost-field boost-effective">
							장착 변경 일시
							<input
								type="datetime-local"
								disabled={busy}
								value={effective}
								max={localDateTime(new Date())}
								onChange={(e) => setEffective(e.target.value)}
								required
							/>
						</label>
					)}
					<div className="boost-savebar">
						<button
							type="button"
							className="boost-primary"
							disabled={busy || !bikeId || (!activity && !dirty) || !effective}
							onClick={apply}
						>
							{busy ? "저장 중…" : activity ? "이 라이딩에 적용" : "장착 변경 기록"}
						</button>
						<output aria-live="polite">
							{message || (dirty ? "변경한 조합을 적용해 주세요" : "저장된 기록")}
						</output>
					</div>
				</section>
				<aside className="boost-library" aria-label="부품 보관함">
					{!picking && library}
				</aside>
			</div>
			<p className="boost-footnote">
				{activity
					? "이 라이딩만 수정합니다. 현재 장착 상태와 다른 라이딩은 유지됩니다."
					: "이미 확정한 라이딩의 부품 기록은 유지됩니다. 부품을 옮길 때는 기존 자전거에서 먼저 분리해 주세요."}
			</p>
			{picking && (
				<Modal title={`${slots[slot].label} 선택`} close={() => setPicking(false)} sheet>
					{message && (
						<output aria-live="polite" className="boost-muted">
							{message}
						</output>
					)}
					{library}
				</Modal>
			)}
			{presetName !== null && (
				<Modal title="빠른 조합 저장" close={() => setPresetName(null)}>
					<form
						className="boost-form"
						onSubmit={async (e) => {
							e.preventDefault();
							if (
								await save({
									...garage,
									presets: [
										...garage.presets,
										{
											id: crypto.randomUUID(),
											bikeId,
											name: presetName.trim(),
											parts: { ...draft },
										},
									],
								})
							)
								setPresetName(null);
						}}
					>
						<label className="boost-field">
							조합 이름
							<input
								value={presetName}
								onChange={(e) => setPresetName(e.target.value)}
								required
								maxLength={80}
								placeholder="장거리, 업힐 등"
							/>
						</label>
						<button className="boost-primary" disabled={busy}>
							조합 저장
						</button>
					</form>
				</Modal>
			)}
		</>
	);
}
