"use client";
import { Check, GripVertical, Pencil, Plus, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
	type Configuration,
	configurationAt,
	type Garage,
	kindLabels,
	type PartKind,
	type Preset,
	partDistance,
	type Slot,
	slots,
	validateConfiguration,
} from "@/lib/equipment";
import type { StravaActivity } from "@/types/strava";
import { localDateTime } from "../_lib/local-date-time";
import {
	orderedBikePresets,
	preferredWorkbenchPreset,
	sameConfiguration,
} from "../_lib/workbench-preset";
import { ConfigurationSummary } from "./ConfigurationSummary";
import { DateInput } from "./DateInput";
import { Modal } from "./Modal";
import { PartIcon } from "./PartIcon";
import { PresetUsage } from "./PresetUsage";

// Preferences remain local; selecting a combination never writes to the server.
function rememberedPresetId(bikeId: string) {
	try {
		return localStorage.getItem(`trace:bike:${bikeId}:preset`);
	} catch {
		return null;
	}
}
function rememberPreset(bikeId: string, presetId: string) {
	try {
		localStorage.setItem(`trace:bike:${bikeId}:preset`, presetId);
	} catch {
		/* Viewing still works when browser storage is unavailable. */
	}
}

type WorkbenchProps = {
	garage: Garage;
	activities: StravaActivity[];
	bikeId: string;
	save: (garage: Garage) => Promise<boolean>;
	busy: boolean;
	editPart: (id: string) => void;
	onDirty: (dirty: boolean) => void;
	onAssign: (preset: Preset) => void;
};

export function Workbench({
	garage,
	activities,
	bikeId,
	save,
	busy,
	editPart,
	onDirty,
	onAssign,
}: WorkbenchProps) {
	const [draft, setDraft] = useState<Configuration>({});
	const [slot, setSlot] = useState<Slot>("wheelset");
	const [category, setCategory] = useState<PartKind>("wheelset");
	const [over, setOver] = useState<Slot | null>(null);
	const [message, setMessage] = useState("");
	const [presetName, setPresetName] = useState("");
	const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
	const [creatingPreset, setCreatingPreset] = useState(false);
	const [editingPreset, setEditingPreset] = useState(false);
	const [editingUsage, setEditingUsage] = useState(false);
	const [deletingPreset, setDeletingPreset] = useState(false);
	const [showInstallationForm, setShowInstallationForm] = useState(false);
	const [effective, setEffective] = useState(localDateTime(new Date()));
	const [expanded, setExpanded] = useState(false);
	const [picking, setPicking] = useState(false);
	const selectedPreset = garage.presets.find(
		(preset) => preset.id === selectedPresetId && preset.bikeId === bikeId,
	);
	const presetChanged = Boolean(
		selectedPreset &&
			(presetName.trim() !== selectedPreset.name ||
				!sameConfiguration(draft, selectedPreset.parts)),
	);
	const unsaved = creatingPreset || (editingPreset && presetChanged) || editingUsage;
	const displayedBikeId = useRef<string | null>(null);

	useEffect(() => {
		// Background refresh must not discard a combination being edited.
		if (displayedBikeId.current === bikeId && (editingPreset || unsaved || showInstallationForm))
			return;
		displayedBikeId.current = bikeId;
		const installed = configurationAt(garage, bikeId, new Date().toISOString());
		showPreset(
			preferredWorkbenchPreset(garage.presets, bikeId, rememberedPresetId(bikeId), installed),
		);
	}, [garage.presets, bikeId]);

	useEffect(() => {
		onDirty(unsaved);
	}, [unsaved, onDirty]);

	function discardChanges() {
		return !unsaved || window.confirm("저장하지 않은 조합 변경을 버릴까요?");
	}
	function showPreset(preset: Preset | undefined) {
		setSelectedPresetId(preset?.id ?? null);
		setPresetName(preset?.name ?? "");
		setDraft({ ...preset?.parts });
		setCreatingPreset(false);
		setEditingPreset(false);
		setEditingUsage(false);
		setDeletingPreset(false);
		setShowInstallationForm(false);
		setPicking(false);
		setMessage("");
		if (preset) rememberPreset(bikeId, preset.id);
	}
	function createPreset() {
		if (!discardChanges()) return;
		showPreset(undefined);
		setCreatingPreset(true);
		setEditingPreset(true);
	}
	function cancelPresetChanges() {
		if (!discardChanges()) return;
		showPreset(
			selectedPreset ??
				preferredWorkbenchPreset(
					garage.presets,
					bikeId,
					rememberedPresetId(bikeId),
					configurationAt(garage, bikeId, new Date().toISOString()),
				),
		);
	}
	async function deletePreset() {
		if (!selectedPreset || busy) return;
		const presets = garage.presets.filter((preset) => preset.id !== selectedPreset.id);
		if (await save({ ...garage, presets }))
			showPreset(
				preferredWorkbenchPreset(
					presets,
					bikeId,
					null,
					configurationAt(garage, bikeId, new Date().toISOString()),
				),
			);
	}
	async function savePreset() {
		if (busy) return;
		try {
			const name = presetName.trim();
			if (!name) throw new Error("조합 이름을 입력해 주세요.");
			if (!Object.keys(draft).length) throw new Error("부품을 하나 이상 선택해 주세요.");
			if (
				garage.presets.some(
					(preset) =>
						preset.bikeId === bikeId && preset.id !== selectedPresetId && preset.name === name,
				)
			)
				throw new Error("같은 이름의 조합이 있습니다.");
			validateConfiguration(garage, draft);
			const preset = {
				...selectedPreset,
				id: selectedPreset?.id ?? crypto.randomUUID(),
				bikeId,
				name,
				parts: { ...draft },
			};
			const presets = creatingPreset
				? [...garage.presets, preset]
				: garage.presets.map((item) => (item.id === preset.id ? preset : item));
			if (await save({ ...garage, presets })) showPreset(preset);
		} catch (cause) {
			setMessage(cause instanceof Error ? cause.message : "조합을 저장하지 못했습니다.");
		}
	}
	function select(id: string, target: Slot) {
		if (busy) return;
		const next = { ...draft, [target]: id };
		try {
			validateConfiguration(garage, next);
			setDraft(next);
			setPicking(false);
			setMessage("");
		} catch (cause) {
			setMessage(cause instanceof Error ? cause.message : "부품을 선택하지 못했습니다.");
		}
	}
	async function recordInstallation() {
		if (!selectedPreset || busy) return;
		try {
			const at = new Date(effective).toISOString();
			if (Date.parse(at) > Date.now()) throw new Error("장착 일시는 미래로 지정할 수 없습니다.");
			validateConfiguration(garage, selectedPreset.parts, at);
			if (
				await save({
					...garage,
					installations: [
						...garage.installations,
						{ id: crypto.randomUUID(), bikeId, at, parts: { ...selectedPreset.parts } },
					],
				})
			) {
				setShowInstallationForm(false);
				setMessage("");
			}
		} catch (cause) {
			setMessage(cause instanceof Error ? cause.message : "장착 일시를 확인해 주세요.");
		}
	}
	// Definitions may include retired parts for historical combinations; dates are checked when applied.
	const available = garage.parts.filter((part) => part.kind === category);
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
			<div className="boost-section-head boost-combination-toolbar">
				<h2>{garage.bikes.find((bike) => bike.id === bikeId)?.name}</h2>
				<button type="button" className="boost-secondary" disabled={busy} onClick={createPreset}>
					<Plus size={16} /> 새 조합
				</button>
			</div>
			{!editingPreset && (
				<fieldset className="boost-preset-list" aria-label="저장된 조합 선택">
					{orderedBikePresets(garage.presets, bikeId, localDateTime(new Date()).slice(0, 10)).map(
						(preset) => (
							<button
								type="button"
								className="boost-preset-chip"
								key={preset.id}
								disabled={busy}
								aria-pressed={preset.id === selectedPresetId}
								onClick={() => {
									if (discardChanges()) showPreset(preset);
								}}
							>
								{preset.id === selectedPresetId && <Check size={14} />}
								{preset.name}
							</button>
						),
					)}
				</fieldset>
			)}
			{editingPreset ? (
				<>
					<button
						type="button"
						className="boost-text boost-editor-back"
						disabled={busy}
						onClick={cancelPresetChanges}
					>
						← 조합 목록
					</button>
					<div className="boost-workspace">
						<section
							className="boost-build"
							aria-label={creatingPreset ? "새 조합 만들기" : "조합 수정"}
						>
							<label className="boost-field boost-combination-name">
								조합 이름
								<input
									value={presetName}
									maxLength={80}
									disabled={busy}
									onChange={(event) => setPresetName(event.target.value)}
									placeholder="예: 353 · 오천성"
								/>
							</label>
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
														setMessage("");
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
							<div className="boost-combination-savebar">
								{selectedPreset && (
									<button
										type="button"
										className="boost-text boost-danger"
										disabled={busy}
										onClick={() => setDeletingPreset(true)}
									>
										조합 삭제
									</button>
								)}
								<div>
									<button
										type="button"
										className="boost-secondary"
										disabled={busy}
										onClick={cancelPresetChanges}
									>
										취소
									</button>
									<button
										type="button"
										className="boost-primary"
										disabled={
											busy ||
											!presetName.trim() ||
											!Object.keys(draft).length ||
											(!creatingPreset && !presetChanged)
										}
										onClick={savePreset}
									>
										{busy ? "저장 중…" : "조합 저장"}
									</button>
								</div>
							</div>
							{message && (
								<p role="alert" className="boost-error">
									{message}
								</p>
							)}
						</section>
						<aside className="boost-library" aria-label="부품 보관함">
							{!picking && library}
						</aside>
					</div>
				</>
			) : selectedPreset ? (
				<section className="boost-combination-overview" aria-label="선택한 조합">
					<div className="boost-section-head">
						<h2>{selectedPreset.name}</h2>
						<button
							type="button"
							className="boost-secondary"
							disabled={busy}
							onClick={() => {
								setDraft({ ...selectedPreset.parts });
								setPresetName(selectedPreset.name);
								setEditingPreset(true);
							}}
						>
							<Pencil size={15} /> 조합 수정
						</button>
					</div>
					<PresetUsage
						garage={garage}
						preset={selectedPreset}
						busy={busy}
						disabled={false}
						save={save}
						onEditingChange={setEditingUsage}
					/>
					<ConfigurationSummary garage={garage} parts={selectedPreset.parts} />
					<div className="boost-combination-use">
						<button
							type="button"
							className="boost-primary"
							disabled={busy}
							onClick={() => onAssign(selectedPreset)}
						>
							라이딩에 배정
						</button>
					</div>
					<details className="boost-installation-history">
						<summary>장착 이력</summary>
						<p className="boost-muted">
							이 조합으로 장착을 변경한 시점을 기록합니다. 개별 배정하지 않은 라이딩의 부품 사용
							거리 계산에 반영됩니다.
						</p>
						<ConfigurationSummary
							garage={garage}
							parts={configurationAt(garage, bikeId, new Date().toISOString())}
						/>
						<button
							type="button"
							className="boost-text"
							disabled={busy}
							onClick={() => {
								setEffective(localDateTime(new Date()));
								setMessage("");
								setShowInstallationForm(true);
							}}
						>
							선택한 조합으로 장착 변경 기록
						</button>
					</details>
				</section>
			) : (
				<section className="boost-empty">
					<p>아직 저장된 조합이 없습니다.</p>
					<button type="button" className="boost-primary" disabled={busy} onClick={createPreset}>
						첫 조합 만들기
					</button>
				</section>
			)}
			{showInstallationForm && selectedPreset && (
				<Modal title="장착 변경 기록" close={() => setShowInstallationForm(false)} busy={busy}>
					<form
						className="boost-form"
						onSubmit={(event) => {
							event.preventDefault();
							void recordInstallation();
						}}
					>
						<p>{selectedPreset.name}</p>
						<label className="boost-field">
							장착 변경 일시
							<DateInput
								withTime
								required
								disabled={busy}
								value={effective}
								max={localDateTime(new Date())}
								onChange={setEffective}
							/>
						</label>
						{message && (
							<p role="alert" className="boost-error">
								{message}
							</p>
						)}
						<button className="boost-primary" disabled={busy}>
							장착 변경 기록
						</button>
					</form>
				</Modal>
			)}
			{deletingPreset && selectedPreset && (
				<Modal
					title="조합 삭제"
					close={() => setDeletingPreset(false)}
					busy={busy}
					hasChanges={false}
				>
					<p>“{selectedPreset.name}” 조합을 삭제할까요?</p>
					<p>부품, 장착 이력, 라이딩별 부품 기록은 유지됩니다. 삭제한 조합은 복구할 수 없습니다.</p>
					<div className="boost-savebar">
						<button
							type="button"
							className="boost-secondary"
							disabled={busy}
							onClick={() => setDeletingPreset(false)}
						>
							취소
						</button>
						<button type="button" className="boost-primary" disabled={busy} onClick={deletePreset}>
							조합 삭제하기
						</button>
					</div>
				</Modal>
			)}
			{picking && (
				<Modal title={`${slots[slot].label} 선택`} close={() => setPicking(false)} sheet>
					{library}
				</Modal>
			)}
		</>
	);
}
