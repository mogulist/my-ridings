"use client";

import { useState } from "react";
import { configurationAt, type Garage, type Preset, validateConfiguration } from "@/lib/equipment";
import { localDateTime } from "../_lib/local-date-time";
import { ConfigurationSummary } from "./ConfigurationSummary";
import { DateInput } from "./DateInput";
import { Modal } from "./Modal";

type InstallationHistoryProps = {
	garage: Garage;
	bikeId: string;
	preset?: Preset;
	busy: boolean;
	save: (garage: Garage) => Promise<boolean>;
};

export function InstallationHistory({
	garage,
	bikeId,
	preset,
	busy,
	save,
}: InstallationHistoryProps) {
	const [recording, setRecording] = useState(false);
	const [detachAll, setDetachAll] = useState(false);
	const [effective, setEffective] = useState("");
	const [editedTime, setEditedTime] = useState(false);
	const [error, setError] = useState("");
	const installed = configurationAt(garage, bikeId, new Date().toISOString());

	async function record() {
		if (busy || (!detachAll && !preset)) return;
		try {
			// The date control shows minutes; default-now records still need distinct timestamps.
			const at = editedTime ? new Date(effective).toISOString() : new Date().toISOString();
			if (Date.parse(at) > Date.now()) throw new Error("장착 일시는 미래로 지정할 수 없습니다.");
			const parts = detachAll ? {} : { ...preset!.parts };
			validateConfiguration(garage, parts, at);
			if (
				await save({
					...garage,
					installations: [...garage.installations, { id: crypto.randomUUID(), bikeId, at, parts }],
				})
			)
				setRecording(false);
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : "장착 일시를 확인해 주세요.");
		}
	}

	return (
		<details className="boost-installation-history">
			<summary>장착 이력</summary>
			<p className="boost-muted">
				현재 장착 구성입니다. 변경 시점을 기록하면 개별 배정하지 않은 라이딩의 부품 사용 거리 계산에
				반영됩니다.
			</p>
			<ConfigurationSummary garage={garage} parts={installed} />
			<button
				type="button"
				className="boost-text"
				disabled={busy || (!preset && !Object.keys(installed).length)}
				onClick={() => {
					setEffective(localDateTime(new Date()));
					setEditedTime(false);
					setDetachAll(!preset);
					setError("");
					setRecording(true);
				}}
			>
				장착 변경 기록
			</button>
			{recording && (
				<Modal title="장착 변경 기록" close={() => setRecording(false)} busy={busy}>
					<form
						className="boost-form"
						onSubmit={(event) => {
							event.preventDefault();
							void record();
						}}
					>
						{preset && (
							<label className="boost-field">
								변경할 구성
								<select
									disabled={busy}
									value={detachAll ? "empty" : "preset"}
									onChange={(event) => setDetachAll(event.target.value === "empty")}
								>
									<option value="preset">{preset.name}</option>
									<option value="empty">모든 부품 분리</option>
								</select>
							</label>
						)}
						{detachAll && (
							<p>이 시점부터 장착된 부품이 없는 상태로 기록합니다. 과거 사용 기록은 유지됩니다.</p>
						)}
						<label className="boost-field">
							장착 변경 일시
							<DateInput
								withTime
								required
								disabled={busy}
								value={effective}
								max={localDateTime(new Date())}
								onChange={(value) => {
									setEffective(value);
									setEditedTime(true);
								}}
							/>
						</label>
						{error && (
							<p role="alert" className="boost-error">
								{error}
							</p>
						)}
						<button className="boost-primary" disabled={busy}>
							{busy ? "저장 중…" : "장착 변경 기록"}
						</button>
					</form>
				</Modal>
			)}
		</details>
	);
}
