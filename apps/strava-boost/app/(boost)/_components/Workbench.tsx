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
import { DateInput } from "./DateInput";
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
	const [presetName, setPresetName] = useState("");
	const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
	const [creatingPreset, setCreatingPreset] = useState(false);
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
		setSelectedPresetId(null);
		setCreatingPreset(false);
		setPresetName("");
		setMessage("");
	}, [garage.installations, garage.assignments, bikeId, activity]);
	const selectedPreset = garage.presets.find(
		(p) => p.id === selectedPresetId && p.bikeId === bikeId,
	);
	const sameParts = (a: Configuration, b: Configuration) =>
		(Object.keys(slots) as Slot[]).every((key) => a[key] === b[key]);
	const presetChanged = Boolean(
		!activity &&
			selectedPreset &&
			(presetName.trim() !== selectedPreset.name || !sameParts(draft, selectedPreset.parts)),
	);
	const presetUnsaved = creatingPreset || presetChanged || (!selectedPreset && dirty);
	const assigned = activity ? assignmentFor(garage, activity) : null;
	const appliedParts =
		assigned?.bikeId === bikeId
			? assigned.parts
			: configurationAt(garage, bikeId, activity?.start_date ?? new Date().toISOString());
	const needsApply = !sameParts(draft, appliedParts);
	const unsaved = activity
		? dirty || needsApply || Boolean(assigned && assigned.bikeId !== bikeId)
		: presetUnsaved;
	useEffect(() => {
		onDirty(unsaved);
	}, [unsaved, onDirty]);
	function discardChanges() {
		return !unsaved || window.confirm("저장하지 않은 조합 변경을 버릴까요?");
	}
	async function savePreset() {
		if (activity || busy || (!creatingPreset && !selectedPreset)) return;
		try {
			const name = presetName.trim();
			if (!name) throw new Error("조합 이름을 입력해 주세요.");
			if (!Object.keys(draft).length) throw new Error("부품을 하나 이상 선택해 주세요.");
			if (
				garage.presets.some(
					(p) => p.bikeId === bikeId && p.id !== selectedPresetId && p.name === name,
				)
			)
				throw new Error("같은 이름의 조합이 있습니다. 다른 이름을 입력해 주세요.");
			validateConfiguration(garage, draft);
			const preset = {
				id: selectedPreset?.id ?? crypto.randomUUID(),
				bikeId,
				name,
				parts: { ...draft },
			};
			const presets = creatingPreset
				? [...garage.presets, preset]
				: garage.presets.map((p) => (p.id === preset.id ? preset : p));
			if (await save({ ...garage, presets })) {
				setSelectedPresetId(preset.id);
				setCreatingPreset(false);
				setPresetName(name);
				setDirty(false);
				setMessage("");
			}
		} catch (error) {
			setMessage(error instanceof Error ? error.message : "조합을 저장하지 못했습니다.");
		}
	}
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
					setMessage("");
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
					setMessage("");
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
			<p className="boost-muted">장착 위치를 고른 뒤 부품을 선택하거나 끌어 놓으세요.</p>
			<div className="boost-categories">
				{(Object.keys(kindLabels) as PartKind[]).map((kind) => (
					<button
						type="button"
						className="boost-chip"
						key={kind}
						aria-pressed={kind === category}
						onClick={() => {
							setCategory(kind);
							if (kind === "cassette" || kind === "derailleur" || kind === "brake")
								setExpanded(true);
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
			{!activity && (
				<div className="boost-context">
					<span>
						{creatingPreset
							? "새 조합 작성 중"
							: selectedPreset
								? `${selectedPreset.name} 조합 편집 중`
								: dirty
									? "장착 변경 작성 중"
									: "현재 장착 상태"}
					</span>
					<span>
						{creatingPreset || selectedPreset
							? "조합 저장 후 장착 이력에 별도로 적용하세요"
							: "변경한 시점부터 사용 거리에 반영됩니다"}
					</span>
				</div>
			)}
			<div className="boost-workspace">
				<section className="boost-build" aria-label="부품 조합 작업대">
					<div className="boost-section-head">
						<h2>{garage.bikes.find((b) => b.id === bikeId)?.name}</h2>
						<span className="boost-muted">
							{creatingPreset || selectedPreset
								? "조합 구성"
								: activity
									? "이 라이딩의 사용 부품"
									: "장착 부품"}
						</span>
					</div>
					<div className="boost-presets">
						<span>저장된 조합</span>
						{garage.presets
							.filter((p) => p.bikeId === bikeId)
							.map((p) => (
								<button
									type="button"
									className="boost-chip"
									key={p.id}
									aria-pressed={selectedPresetId === p.id}
									disabled={busy}
									onClick={() => {
										if (!discardChanges()) return;
										setSelectedPresetId(p.id);
										setCreatingPreset(false);
										setPresetName(p.name);
										setDraft({ ...p.parts });
										setDirty(false);
										setMessage(`${p.name} 조합을 불러왔습니다. 적용 전 확인해 주세요.`);
									}}
								>
									{p.name}
								</button>
							))}
						{!activity && (
							<button
								type="button"
								className="boost-text"
								disabled={busy}
								onClick={() => {
									if (!discardChanges()) return;
									setSelectedPresetId(null);
									setCreatingPreset(true);
									setPresetName("");
									setDraft({});
									setDirty(false);
									setMessage("조합 이름과 부품을 선택한 뒤 저장해 주세요.");
								}}
							>
								새 조합 만들기
							</button>
						)}
					</div>
					{!activity && (creatingPreset || selectedPreset) && (
						<div className="boost-preset-editor">
							<label className="boost-field">
								조합 이름
								<input
									value={presetName}
									maxLength={80}
									disabled={busy}
									onChange={(e) => setPresetName(e.target.value)}
									placeholder="사라나 그래블 등"
								/>
							</label>
							<output className="boost-muted" aria-live="polite">
								{creatingPreset
									? "새 조합 작성 중"
									: presetChanged
										? "변경사항 있음"
										: "저장된 조합"}
							</output>
							<button
								type="button"
								className="boost-secondary"
								disabled={
									busy ||
									!presetName.trim() ||
									!Object.keys(draft).length ||
									(!creatingPreset && !presetChanged)
								}
								onClick={savePreset}
							>
								{creatingPreset ? "새 조합 저장" : "조합 저장"}
							</button>
							<button
								type="button"
								className="boost-text"
								disabled={busy}
								onClick={() => {
									if (!discardChanges()) return;
									setSelectedPresetId(null);
									setCreatingPreset(false);
									setPresetName("");
									setDraft({ ...appliedParts });
									setDirty(false);
									setMessage("");
								}}
							>
								작성 취소 · 장착 상태로 돌아가기
							</button>
						</div>
					)}

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
										className={`boost-slot ${key === slot ? "is-active" : ""} ${over === key ? "is-over" : ""} ${key === "wheelset" || key === "chain" || key === "cassette" || key === "derailleur" ? "is-wide" : ""}`}
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
											{part && (
												<small>
													누적{" "}
													{partDistance(garage, activities, part.id).toLocaleString("ko-KR", {
														maximumFractionDigits: 1,
													})}
													km
												</small>
											)}
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
						{expanded ? "추가 부품 접기" : "스프라켓·뒷변속기·브레이크 펼치기"}
					</button>
					{!activity && (
						<label className="boost-field boost-effective">
							장착 변경 일시
							<DateInput
								withTime
								disabled={busy}
								value={effective}
								max={localDateTime(new Date())}
								onChange={setEffective}
								required
							/>
						</label>
					)}
					<div className="boost-savebar">
						<button
							type="button"
							className="boost-primary"
							disabled={
								busy ||
								!bikeId ||
								creatingPreset ||
								presetChanged ||
								(!activity && !needsApply) ||
								!effective
							}
							onClick={apply}
						>
							{busy ? "저장 중…" : activity ? "이 라이딩에 적용" : "장착 변경 기록"}
						</button>
						<output aria-live="polite">
							{message ||
								(unsaved
									? "변경사항을 저장해 주세요"
									: needsApply
										? "저장한 조합을 장착 이력에 적용할 수 있습니다"
										: "저장된 기록")}
						</output>
					</div>
				</section>
				<aside className="boost-library" aria-label="부품 보관함">
					{!picking && library}
				</aside>
			</div>
			{!activity && (
				<p className="boost-footnote">
					이미 확정한 라이딩의 부품 기록은 유지됩니다. 부품을 옮길 때는 기존 자전거에서 먼저 분리해
					주세요.
				</p>
			)}
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
		</>
	);
}
