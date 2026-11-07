"use client";
import { useState } from "react";
import { type Garage, kindLabels, type PartKind, partDistance, partPeriods } from "@/lib/equipment";
import type { StravaActivity } from "@/types/strava";
import { localDateTime } from "../_lib/local-date-time";
import { DateInput } from "./DateInput";
import { Modal } from "./Modal";

type Save = (garage: Garage) => Promise<boolean>;
export function BikeForm({
	garage,
	save,
	close,
	busy,
	bikeId,
}: {
	garage: Garage;
	save: Save;
	close: () => void;
	busy: boolean;
	bikeId?: string;
}) {
	const bike = garage.bikes.find((b) => b.id === bikeId);
	const [name, setName] = useState(bike?.name ?? "");
	const [gear, setGear] = useState(bike?.stravaGearId ?? "");
	const [usedFrom, setUsedFrom] = useState(bike?.usedFrom ?? "");
	const [usedUntil, setUsedUntil] = useState(bike?.usedUntil ?? "");
	const [note, setNote] = useState(bike?.note ?? "");
	return (
		<Modal
			title={bike ? "자전거 정보" : "자전거 등록"}
			close={close}
			busy={busy}
			hasChanges={
				name !== (bike?.name ?? "") ||
				gear !== (bike?.stravaGearId ?? "") ||
				usedFrom !== (bike?.usedFrom ?? "") ||
				usedUntil !== (bike?.usedUntil ?? "") ||
				note !== (bike?.note ?? "")
			}
		>
			<form
				className="boost-form"
				onSubmit={async (e) => {
					e.preventDefault();
					const next = {
						...bike,
						id: bike?.id ?? crypto.randomUUID(),
						name: name.trim(),
						stravaGearId: gear.trim() || null,
						usedFrom: usedFrom || null,
						usedUntil: usedUntil || null,
						note: note.trim(),
					};
					if (
						await save({
							...garage,
							bikes: bike
								? garage.bikes.map((b) => (b.id === bike.id ? next : b))
								: [...garage.bikes, next],
						})
					)
						close();
				}}
			>
				<label className="boost-field">
					자전거 이름
					<input
						required
						maxLength={100}
						value={name}
						onChange={(e) => setName(e.target.value)}
						placeholder="나의 로드 자전거"
					/>
				</label>
				<label className="boost-field">
					Strava 자전거 ID · 선택
					<input
						value={gear}
						onChange={(e) => setGear(e.target.value)}
						placeholder="b12345678"
						pattern="b[0-9]+"
					/>
				</label>
				<div className="boost-field">
					<span>사용 시작일 · 선택</span>
					<DateInput
						value={usedFrom}
						onChange={setUsedFrom}
						max={usedUntil || localDateTime(new Date()).slice(0, 10)}
					/>
				</div>
				<div className="boost-field">
					<span>사용 종료일 · 선택</span>
					<DateInput
						value={usedUntil}
						onChange={setUsedUntil}
						min={usedFrom || undefined}
						max={localDateTime(new Date()).slice(0, 10)}
					/>
				</div>
				<label className="boost-field">
					구매·판매 메모 · 선택
					<textarea
						rows={4}
						maxLength={4000}
						value={note}
						onChange={(e) => setNote(e.target.value)}
						placeholder="구매일, 구매처, 구매·판매 금액, 거래 경위 등을 자유롭게 기록하세요"
					/>
				</label>
				<p className="boost-muted">
					판매한 자전거는 종료일을 기록하세요. 과거 라이딩과 부품 장착 이력은 유지됩니다. 이름과
					사용 기간은 Trace에만 저장됩니다. Strava 동기화는 라이딩에 연결된 자전거를 가져옵니다.
				</p>
				<button className="boost-primary" disabled={busy}>
					{bike ? "자전거 정보 저장" : "자전거 등록"}
				</button>
			</form>
		</Modal>
	);
}
export function PartForm({
	garage,
	activities,
	save,
	close,
	busy,
	partId,
}: {
	garage: Garage;
	activities: StravaActivity[];
	save: Save;
	close: () => void;
	busy: boolean;
	partId?: string;
}) {
	const part = garage.parts.find((p) => p.id === partId);
	const [copying, setCopying] = useState(false);
	const editing = Boolean(part) && !copying;
	const periods = part ? partPeriods(garage, part.id) : [];
	const [name, setName] = useState(part?.name ?? "");
	const [kind, setKind] = useState<PartKind>(part?.kind ?? "tire");
	const [started, setStarted] = useState(
		localDateTime(part ? new Date(part.startedAt) : new Date()).slice(0, 10),
	);
	const [initial, setInitial] = useState(String(part?.initialKm ?? 0));
	const [note, setNote] = useState(part?.note ?? "");
	const [retired, setRetired] = useState(
		part?.retiredAt ? localDateTime(new Date(part.retiredAt)) : "",
	);
	const used =
		part &&
		[...garage.installations, ...garage.assignments, ...garage.presets].some((i) =>
			Object.values(i.parts).includes(part.id),
		);
	return (
		<Modal
			title={copying ? "부품 복제" : part ? "부품 상세" : "부품 등록"}
			close={close}
			busy={busy}
			hasChanges={
				copying ||
				name !== (part?.name ?? "") ||
				kind !== (part?.kind ?? "tire") ||
				note !== (part?.note ?? "") ||
				initial !== String(part?.initialKm ?? 0) ||
				retired !== (part?.retiredAt ? localDateTime(new Date(part.retiredAt)) : "") ||
				started !== localDateTime(part ? new Date(part.startedAt) : new Date()).slice(0, 10)
			}
		>
			<form
				className="boost-form"
				onSubmit={async (e) => {
					e.preventDefault();
					const next = {
						...part,
						id: editing && part ? part.id : crypto.randomUUID(),
						name: name.trim(),
						kind,
						startedAt:
							part && started === localDateTime(new Date(part.startedAt)).slice(0, 10)
								? part.startedAt
								: new Date(`${started}T00:00:00`).toISOString(),
						initialKm: Number(initial),
						retiredAt: editing && retired ? new Date(retired).toISOString() : null,
						note: note.trim(),
					};
					if (
						await save({
							...garage,
							parts:
								editing && part
									? garage.parts.map((p) => (p.id === part.id ? next : p))
									: [...garage.parts, next],
						})
					)
						close();
				}}
			>
				{copying && (
					<p className="boost-muted">
						입력 내용을 복사했습니다. 이름과 식별 번호를 바꾼 뒤 새 부품으로 등록하세요. 장착·정비
						이력은 복사하지 않습니다.
					</p>
				)}
				{editing && part && (
					<div className="boost-part-summary">
						<strong>
							{partDistance(garage, activities, part.id).toLocaleString("ko-KR", {
								maximumFractionDigits: 1,
							})}
							km
						</strong>
						<span>기존 사용 거리 + 기록된 라이딩 거리</span>
						<span>
							장착 이력 기준{" "}
							{Math.floor(periods.reduce((sum, p) => sum + p.end - p.start, 0) / 86400000)}일 · 추적
							시작 전 기간 제외
						</span>
					</div>
				)}
				{editing && periods.length > 0 && (
					<details className="boost-part-history">
						<summary>자전거별 장착 이력</summary>
						{periods.map((period) => (
							<p key={`${period.bikeId}:${period.start}`}>
								{garage.bikes.find((b) => b.id === period.bikeId)?.name}:{" "}
								{new Date(period.start).toLocaleDateString("ko-KR")} ~{" "}
								{period.current ? "현재" : new Date(period.end).toLocaleDateString("ko-KR")}
							</p>
						))}
					</details>
				)}
				<label className="boost-field">
					이름과 식별 번호
					<input
						required
						maxLength={100}
						value={name}
						onChange={(e) => setName(e.target.value)}
						placeholder="GP5000 28C · 01"
					/>
				</label>
				<label className="boost-field">
					부품 종류
					<select
						value={kind}
						onChange={(e) => setKind(e.target.value as PartKind)}
						disabled={editing}
					>
						{Object.entries(kindLabels).map(([id, label]) => (
							<option key={id} value={id}>
								{label}
							</option>
						))}
					</select>
				</label>
				<label className="boost-field">
					추적 시작일
					<DateInput
						value={started}
						onChange={setStarted}
						max={localDateTime(new Date()).slice(0, 10)}
						required
					/>
				</label>
				<label className="boost-field">
					추적 시작 전 사용 거리 · km
					<input
						type="number"
						min="0"
						step="0.1"
						required
						value={initial}
						onChange={(e) => setInitial(e.target.value)}
					/>
				</label>
				<p className="boost-muted">
					추적 시작 이후 라이딩은 별도로 더해집니다. 이미 사용 중인 부품이라면 이전 거리만
					입력하세요.
				</p>
				<label className="boost-field">
					구매·부품 메모 · 선택
					<textarea
						rows={3}
						maxLength={4000}
						value={note}
						onChange={(e) => setNote(e.target.value)}
						placeholder="구매일, 구매처, 금액, 보관 위치 등을 자유롭게 기록하세요"
					/>
				</label>
				{editing && (
					<label className="boost-field">
						사용 종료 일시 · 선택
						<DateInput
							withTime
							value={retired}
							min={`${started}T00:00`}
							max={localDateTime(new Date())}
							onChange={setRetired}
						/>
						<span className="boost-muted">
							{used
								? "장착된 부품은 작업대에서 먼저 분리하고 종료해 주세요."
								: "보관 중인 부품은 종료하지 않아도 됩니다."}
						</span>
					</label>
				)}
				<button className="boost-primary" disabled={busy}>
					{editing ? "부품 정보 저장" : "부품 등록"}
				</button>
				{editing && (
					<button
						type="button"
						className="boost-secondary"
						disabled={busy}
						onClick={(e) => {
							e.currentTarget.closest("form")?.querySelector("input")?.focus();
							setCopying(true);
							setRetired("");
						}}
					>
						이 부품 복제
					</button>
				)}
			</form>
		</Modal>
	);
}
