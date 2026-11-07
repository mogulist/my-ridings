"use client";
import { useState } from "react";
import { type Garage, kindLabels, type PartKind, partDistance, partPeriods } from "@/lib/equipment";
import type { StravaActivity } from "@/types/strava";
import { localDateTime } from "../_lib/local-date-time";
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
	return (
		<Modal title={bike ? "자전거 정보" : "자전거 등록"} close={close}>
			<form
				className="boost-form"
				onSubmit={async (e) => {
					e.preventDefault();
					const next = {
						id: bike?.id ?? crypto.randomUUID(),
						name: name.trim(),
						stravaGearId: gear.trim() || null,
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
				<p className="boost-muted">
					Strava와 동기화하면 등록된 자전거를 자동으로 가져옵니다. 여기서 등록한 이름은 Trace에만
					저장됩니다.
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
	const periods = part ? partPeriods(garage, part.id) : [];
	const [name, setName] = useState(part?.name ?? "");
	const [kind, setKind] = useState<PartKind>(part?.kind ?? "tire");
	const [started, setStarted] = useState(
		part ? localDateTime(new Date(part.startedAt)) : localDateTime(new Date()),
	);
	const [initial, setInitial] = useState(String(part?.initialKm ?? 0));
	const [retired, setRetired] = useState(
		part?.retiredAt ? localDateTime(new Date(part.retiredAt)) : "",
	);
	const used =
		part &&
		[...garage.installations, ...garage.assignments, ...garage.presets].some((i) =>
			Object.values(i.parts).includes(part.id),
		);
	return (
		<Modal title={part ? "부품 상세" : "부품 등록"} close={close}>
			<form
				className="boost-form"
				onSubmit={async (e) => {
					e.preventDefault();
					const next = {
						id: part?.id ?? crypto.randomUUID(),
						name: name.trim(),
						kind,
						startedAt: new Date(started).toISOString(),
						initialKm: Number(initial),
						retiredAt: retired ? new Date(retired).toISOString() : null,
					};
					if (
						await save({
							...garage,
							parts: part
								? garage.parts.map((p) => (p.id === part.id ? next : p))
								: [...garage.parts, next],
						})
					)
						close();
				}}
			>
				{part && (
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
				{part && periods.length > 0 && (
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
						disabled={Boolean(part)}
					>
						{Object.entries(kindLabels).map(([id, label]) => (
							<option key={id} value={id}>
								{label}
							</option>
						))}
					</select>
				</label>
				<label className="boost-field">
					추적 시작 일시
					<input
						type="datetime-local"
						value={started}
						onChange={(e) => setStarted(e.target.value)}
						max={localDateTime(new Date())}
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
				{part && (
					<label className="boost-field">
						사용 종료 일시 · 선택
						<input
							type="datetime-local"
							value={retired}
							min={started}
							max={localDateTime(new Date())}
							onChange={(e) => setRetired(e.target.value)}
						/>
						<span className="boost-muted">
							{used
								? "장착된 부품은 작업대에서 먼저 분리하고 종료해 주세요."
								: "보관 중인 부품은 종료하지 않아도 됩니다."}
						</span>
					</label>
				)}
				<button className="boost-primary" disabled={busy}>
					{part ? "부품 정보 저장" : "부품 등록"}
				</button>
			</form>
		</Modal>
	);
}
