"use client";
import { Check, Droplets, Plus } from "lucide-react";
import { useState } from "react";
import { type Garage, type ServiceRule, serviceStatus } from "@/lib/equipment";
import type { StravaActivity } from "@/types/strava";
import { localDateTime } from "../_lib/local-date-time";
import { Modal } from "./Modal";
export function Maintenance({
	garage,
	activities,
	save,
	busy,
}: {
	garage: Garage;
	activities: StravaActivity[];
	save: (garage: Garage) => Promise<boolean>;
	busy: boolean;
}) {
	const [adding, setAdding] = useState(false);
	const [editingRule, setEditingRule] = useState<string | null>(null);
	const [recording, setRecording] = useState<ServiceRule | null>(null);
	const [name, setName] = useState("");
	const [target, setTarget] = useState("");
	const [km, setKm] = useState("");
	const [days, setDays] = useState("");
	const [at, setAt] = useState(localDateTime(new Date()));
	const [note, setNote] = useState("");
	const targets = [...garage.parts.filter((p) => !p.retiredAt), ...garage.bikes];
	const activeRules = garage.rules.filter(
		(r) => !garage.parts.find((p) => p.id === r.targetId)?.retiredAt,
	);
	const sortedRules = activeRules
		.map((rule) => ({ rule, status: serviceStatus(garage, activities, rule) }))
		.sort((a, b) => b.status.ratio - a.status.ratio);
	return (
		<section className="boost-maintenance">
			<div className="boost-section-head">
				<div>
					<p className="boost-eyebrow">다음 라이딩을 위한 준비</p>
					<h2>정비할 때를 놓치지 않도록</h2>
				</div>
				<button
					type="button"
					className="boost-secondary"
					disabled={!targets.length}
					onClick={() => {
						setAdding(true);
						setEditingRule(null);
						setName("");
						setKm("");
						setDays("");
						setTarget(targets[0]?.id ?? "");
					}}
				>
					<Plus size={16} />
					정비 주기
				</button>
			</div>
			{!sortedRules.length && (
				<div className="boost-empty">
					<Droplets size={30} />
					<h3>왁싱, 블리딩, 교체 주기를 기록하세요.</h3>
					<p>부품이나 자전거를 등록한 뒤 거리와 기간 기준을 설정할 수 있습니다.</p>
				</div>
			)}
			<div className="boost-service-list">
				{sortedRules.map(({ rule, status }) => {
					const targetName = targets.find((p) => p.id === rule.targetId)?.name ?? "보관된 부품";
					return (
						<article key={rule.id} className={`boost-service is-${status.state}`}>
							<div>
								<span className="boost-service-state">
									{
										{
											due: "정비 기준 도달",
											soon: "곧 정비",
											ok: "여유 있음",
											unknown: "이전 정비일 필요",
										}[status.state]
									}
								</span>
								<h3>
									{targetName} · {rule.name}
								</h3>
								<p>
									{status.last
										? `마지막 정비 후 ${status.km.toFixed(1)}km · ${status.days}일`
										: "마지막 정비를 기록하면 주기 추적을 시작합니다."}
								</p>
								<small>
									알림 기준 {rule.km ? `${rule.km.toLocaleString()}km` : ""}
									{rule.km && rule.days ? " 또는 " : ""}
									{rule.days ? `${rule.days}일` : ""}
								</small>
							</div>
							<button
								type="button"
								className="boost-text"
								disabled={busy}
								onClick={() => {
									setEditingRule(rule.id);
									setName(rule.name);
									setTarget(rule.targetId);
									setKm(rule.km ? String(rule.km) : "");
									setDays(rule.days ? String(rule.days) : "");
									setAdding(true);
								}}
							>
								주기 수정
							</button>
							<button
								type="button"
								className="boost-secondary"
								onClick={() => {
									setRecording(rule);
									setAt(localDateTime(new Date()));
									setNote("");
								}}
							>
								<Check size={16} />
								정비 기록
							</button>
						</article>
					);
				})}
			</div>
			<p className="boost-footnote">
				거리와 기간 중 먼저 도달한 기준을 표시합니다. 현재 알림은 앱 안에서 확인하며, 부품 상태에
				따른 실제 정비 판단과 함께 사용하세요.
			</p>
			{garage.services.length > 0 && (
				<details className="boost-history">
					<summary>정비 이력 · {garage.services.length}건</summary>
					{[...garage.services]
						.sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
						.map((event) => {
							const rule = garage.rules.find((r) => r.id === event.ruleId);
							return (
								<div className="boost-history-row" key={event.id}>
									<span>{new Date(event.at).toLocaleString("ko-KR")}</span>
									<strong>
										{targets.find((t) => t.id === rule?.targetId)?.name ?? "보관된 부품"} ·{" "}
										{rule?.name}
									</strong>
									{event.note && <p>{event.note}</p>}
									<button
										type="button"
										className="boost-text"
										disabled={busy}
										onClick={() => {
											if (window.confirm("이 정비 기록을 삭제하고 정비 주기를 다시 계산할까요?"))
												void save({
													...garage,
													services: garage.services.filter((s) => s.id !== event.id),
												});
										}}
									>
										기록 삭제
									</button>
								</div>
							);
						})}
				</details>
			)}
			{adding && (
				<Modal title="정비 주기 설정" close={() => setAdding(false)}>
					<form
						className="boost-form"
						onSubmit={async (e) => {
							e.preventDefault();
							if (
								await save({
									...garage,
									rules: editingRule
										? garage.rules.map((r) =>
												r.id === editingRule
													? {
															id: r.id,
															name: name.trim(),
															targetId: target,
															km: km ? Number(km) : null,
															days: days ? Number(days) : null,
														}
													: r,
											)
										: [
												...garage.rules,
												{
													id: crypto.randomUUID(),
													name: name.trim(),
													targetId: target,
													km: km ? Number(km) : null,
													days: days ? Number(days) : null,
												},
											],
								})
							) {
								setAdding(false);
								setName("");
								setKm("");
								setDays("");
							}
						}}
					>
						<label className="boost-field">
							대상
							<select
								disabled={Boolean(editingRule)}
								value={target}
								onChange={(e) => setTarget(e.target.value)}
								required
							>
								{targets.map((t) => (
									<option key={t.id} value={t.id}>
										{t.name}
									</option>
								))}
							</select>
						</label>
						<label className="boost-field">
							정비 이름
							<input
								required
								maxLength={100}
								value={name}
								onChange={(e) => setName(e.target.value)}
								placeholder="체인 왁싱, 브레이크 블리딩 등"
							/>
						</label>
						<div className="boost-form-grid">
							<label className="boost-field">
								거리 기준 · km
								<input
									type="number"
									min="1"
									step="1"
									value={km}
									onChange={(e) => setKm(e.target.value)}
								/>
							</label>
							<label className="boost-field">
								기간 기준 · 일
								<input
									type="number"
									min="1"
									step="1"
									value={days}
									onChange={(e) => setDays(e.target.value)}
								/>
							</label>
						</div>
						<p className="boost-muted">
							거리 또는 기간을 하나 이상 입력하세요. 주기는 직접 설정합니다.
						</p>
						<button className="boost-primary" disabled={busy || (!km && !days)}>
							주기 저장
						</button>
					</form>
				</Modal>
			)}
			{recording && (
				<Modal title={`${recording.name} 기록`} close={() => setRecording(null)}>
					<form
						className="boost-form"
						onSubmit={async (e) => {
							e.preventDefault();
							if (
								await save({
									...garage,
									services: [
										...garage.services,
										{
											id: crypto.randomUUID(),
											ruleId: recording.id,
											at: new Date(at).toISOString(),
											note: note.trim(),
										},
									],
								})
							)
								setRecording(null);
						}}
					>
						<label className="boost-field">
							정비 일시
							<input
								required
								type="datetime-local"
								max={localDateTime(new Date())}
								value={at}
								onChange={(e) => setAt(e.target.value)}
							/>
						</label>
						<label className="boost-field">
							메모 · 선택
							<textarea
								rows={3}
								maxLength={2000}
								value={note}
								onChange={(e) => setNote(e.target.value)}
							/>
						</label>
						<p className="boost-muted">
							정비 후 거리·기간을 다시 계산합니다. 부품의 전체 사용 거리는 유지됩니다.
						</p>
						<button className="boost-primary" disabled={busy}>
							정비 기록 저장
						</button>
					</form>
				</Modal>
			)}
		</section>
	);
}
