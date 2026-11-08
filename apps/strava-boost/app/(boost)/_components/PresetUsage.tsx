"use client";

import { Pencil } from "lucide-react";
import { useState } from "react";
import { type Garage, type Preset, validateGarage } from "@/lib/equipment";
import { Modal } from "./Modal";

type PresetUsageProps = {
	garage: Garage;
	preset: Preset;
	busy: boolean;
	disabled: boolean;
	save: (garage: Garage) => Promise<boolean>;
	onEditingChange: (editing: boolean) => void;
};

export function PresetUsage({
	garage,
	preset,
	busy,
	disabled,
	save,
	onEditingChange,
}: PresetUsageProps) {
	const [editing, setEditing] = useState(false);
	function close() {
		setEditing(false);
		onEditingChange(false);
	}
	return (
		<section className="boost-preset-usage" aria-label={`${preset.name} 사용 기간`}>
			<button
				type="button"
				className="boost-text boost-usage-link"
				aria-label={`${preset.name} 사용 기간 수정`}
				disabled={busy || disabled}
				onClick={() => {
					setEditing(true);
					onEditingChange(true);
				}}
			>
				{preset.usedFrom || preset.usedUntil
					? `${preset.usedFrom || "시작일 미상"} ~ ${preset.usedUntil || "현재"}`
					: "사용 기간 설정"}
				{preset.estimated && <span className="boost-muted">(추정)</span>}
				<Pencil size={13} aria-hidden="true" />
			</button>
			{editing && (
				<PresetUsageForm garage={garage} preset={preset} busy={busy} save={save} close={close} />
			)}
		</section>
	);
}

type PresetUsageFormProps = Pick<PresetUsageProps, "garage" | "preset" | "busy" | "save"> & {
	close: () => void;
};

function PresetUsageForm({ garage, preset, busy, save, close }: PresetUsageFormProps) {
	const [from, setFrom] = useState(preset.usedFrom ?? "");
	const [until, setUntil] = useState(preset.usedUntil ?? "");
	const [estimated, setEstimated] = useState(preset.estimated ?? false);
	const [note, setNote] = useState(preset.note ?? "");
	const [error, setError] = useState("");
	const changed =
		from !== (preset.usedFrom ?? "") ||
		until !== (preset.usedUntil ?? "") ||
		estimated !== (preset.estimated ?? false) ||
		note !== (preset.note ?? "");
	return (
		<Modal title={`${preset.name} 사용 기간`} close={close} busy={busy} hasChanges={changed}>
			<form
				className="boost-form boost-usage-form"
				onSubmit={async (event) => {
					event.preventDefault();
					if (busy) return;
					try {
						const updated: Preset = {
							id: preset.id,
							bikeId: preset.bikeId,
							name: preset.name,
							parts: preset.parts,
							usedFrom: from || null,
							usedUntil: until || null,
							estimated,
							note,
						};
						const next = {
							...garage,
							presets: garage.presets.map((p) => (p.id === preset.id ? updated : p)),
						};
						validateGarage(next);
						if (await save(next)) close();
					} catch (cause) {
						setError(cause instanceof Error ? cause.message : "사용 기간을 확인해 주세요.");
					}
				}}
			>
				<div className="boost-form-grid">
					<label className="boost-field">
						시작일 · 연-월-일
						<input
							aria-label="조합 사용 시작일"
							disabled={busy}
							placeholder="YYYY-MM-DD"
							pattern="\d{4}-\d{2}-\d{2}"
							value={from}
							onChange={(event) => setFrom(event.target.value)}
						/>
					</label>
					<label className="boost-field">
						종료일 · 비우면 현재
						<input
							aria-label="조합 사용 종료일"
							disabled={busy}
							placeholder="YYYY-MM-DD"
							pattern="\d{4}-\d{2}-\d{2}"
							value={until}
							onChange={(event) => setUntil(event.target.value)}
						/>
					</label>
				</div>
				<label className="boost-favorite-field">
					<input
						type="checkbox"
						disabled={busy}
						checked={estimated}
						onChange={(event) => setEstimated(event.target.checked)}
					/>
					일부 날짜 추정
				</label>
				<label className="boost-field">
					근거·메모
					<textarea
						disabled={busy}
						rows={4}
						maxLength={4000}
						value={note}
						onChange={(event) => setNote(event.target.value)}
						placeholder="날짜 근거, 다시 사용한 시점 등을 자유롭게 기록하세요"
					/>
				</label>
				<p className="boost-muted">라이딩별 조합은 라이딩 목록에서 수정할 수 있습니다.</p>
				{error && (
					<p role="alert" className="boost-error">
						{error}
					</p>
				)}
				<button className="boost-primary" disabled={busy || !changed}>
					{busy ? "저장 중…" : "사용 기간 저장"}
				</button>
			</form>
		</Modal>
	);
}
