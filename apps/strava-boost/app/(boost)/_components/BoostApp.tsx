"use client";
import { Bike as BikeIcon, ChevronRight, LogOut, Plus, RefreshCw, Wrench } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { SiteNavigation } from "@/app/_components/SiteNavigation";
import { boostRequest, type CloudSession, cloudSession } from "@/app/(boost)/_lib/boost-client";
import {
	assignmentFor,
	emptyGarage,
	type Garage,
	isRide,
	kindLabels,
	partDistance,
	validateGarage,
} from "@/lib/equipment";
import { getGearInfos } from "@/lib/gear-cache";
import { dbUtils } from "@/lib/indexeddb";
import { clearAuth, getAuthUrl } from "@/lib/strava-auth";
import { ACTIVITY_CHANGED, getStoredActivities, syncActivities } from "@/lib/sync";
import type { StravaActivity } from "@/types/strava";
import { BikeForm, PartForm } from "./EquipmentForms";
import { Maintenance } from "./Maintenance";
import { SaveErrorContext } from "./Modal";
import { PartIcon } from "./PartIcon";
import { Workbench } from "./Workbench";

import "./boost.css";

type View = "home" | "garage" | "rides";
export function BoostApp({
	demo = false,
	initialData,
}: {
	demo?: boolean;
	initialData?: { garage: Garage; activities: StravaActivity[] };
}) {
	const [session, setSession] = useState<CloudSession | null>(
		demo ? { configured: true, athleteId: 1 } : null,
	);
	const [garage, setGarage] = useState<Garage>(() => initialData?.garage ?? emptyGarage());
	const [activities, setActivities] = useState<StravaActivity[]>(
		() => initialData?.activities ?? [],
	);
	const [revision, setRevision] = useState(0);
	const [view, setView] = useState<View>("home");
	const [bikeId, setBikeId] = useState(demo ? "bike-a" : "");
	const [activityId, setActivityId] = useState<number | null>(null);
	const [error, setError] = useState("");
	const [message, setMessage] = useState("");
	const [loading, setLoading] = useState(!demo);
	const [busy, setBusy] = useState(false);
	const [syncing, setSyncing] = useState(false);
	const [modal, setModal] = useState<"bike" | "part" | null>(null);
	const [partId, setPartId] = useState<string | undefined>();
	const [editingBike, setEditingBike] = useState<string | undefined>();
	const [filter, setFilter] = useState("");
	const saving = useRef(false);
	const dirty = useRef(false);
	const activity = activities.find((a) => a.id === activityId) ?? null;
	const rides = activities
		.filter(isRide)
		.sort((a, b) => Date.parse(b.start_date) - Date.parse(a.start_date));
	const load = useCallback(async () => {
		if (demo) return;
		const s = await cloudSession();
		setSession(s);
		if (!s.athleteId) {
			setGarage(emptyGarage());
			setActivities([]);
			return;
		}
		const [data, rides] = await Promise.all([
			boostRequest<{ garage: Garage; revision: number }>("garage"),
			getStoredActivities(),
		]);
		setGarage(data.garage);
		setRevision(data.revision);
		setActivities(rides);
		setBikeId((id) =>
			data.garage.bikes.some((b) => b.id === id) ? id : (data.garage.bikes[0]?.id ?? ""),
		);
	}, [demo]);
	useEffect(() => {
		if (new URL(window.location.href).searchParams.get("auth") === "failed")
			setError("Strava 연결에 실패했습니다. 활동 조회 권한을 허용한 뒤 다시 연결해 주세요.");
	}, []);
	useEffect(() => {
		let active = true;
		if (!demo)
			load()
				.catch((e) => {
					if (active) setError(e.message);
				})
				.finally(() => {
					if (active) setLoading(false);
				});
		return () => {
			active = false;
		};
	}, [demo, load]);
	useEffect(() => {
		const refresh = () => {
			if (
				document.visibilityState === "visible" &&
				!saving.current &&
				!dirty.current &&
				!syncing &&
				!document.querySelector("dialog[open]")
			)
				load().catch((e) => setError(e.message));
		};
		window.addEventListener("focus", refresh);
		document.addEventListener("visibilitychange", refresh);
		return () => {
			window.removeEventListener("focus", refresh);
			document.removeEventListener("visibilitychange", refresh);
		};
	}, [load, syncing]);
	useEffect(() => {
		const changed = () => {
			if (!dirty.current && !saving.current && !syncing && !document.querySelector("dialog[open]"))
				load().catch((e) => setError(e.message));
			else setMessage("활동이 갱신되었습니다. 조합을 저장한 뒤 최신 기록을 불러와 주세요.");
		};
		window.addEventListener(ACTIVITY_CHANGED, changed);
		return () => window.removeEventListener(ACTIVITY_CHANGED, changed);
	}, [load, syncing]);

	useEffect(() => {
		const warn = (event: BeforeUnloadEvent) => {
			if (dirty.current) {
				event.preventDefault();
				event.returnValue = "";
			}
		};
		window.addEventListener("beforeunload", warn);
		return () => window.removeEventListener("beforeunload", warn);
	}, []);
	async function save(next: Garage) {
		if (saving.current) return false;
		try {
			validateGarage(next);
			saving.current = true;
			setBusy(true);
			setError("");
			if (!demo) {
				const result = await boostRequest<{ revision: number }>("garage", {
					method: "PUT",
					body: JSON.stringify({ garage: next, revision }),
				});
				setRevision(result.revision);
			}
			setGarage(next);
			setMessage(
				demo
					? "체험 화면에 반영했습니다. 실제 데이터는 변경하지 않습니다."
					: "변경 사항을 저장했습니다.",
			);
			setBikeId((id) => (next.bikes.some((b) => b.id === id) ? id : (next.bikes[0]?.id ?? "")));
			return true;
		} catch (e) {
			setError(e instanceof Error ? e.message : "저장하지 못했습니다.");
			return false;
		} finally {
			saving.current = false;
			setBusy(false);
		}
	}
	async function sync() {
		if (syncing || busy) return;
		if (
			dirty.current &&
			!window.confirm("적용하지 않은 조합이 있습니다. 동기화하며 다시 불러올까요?")
		)
			return;
		setSyncing(true);
		setError("");
		try {
			if (demo) {
				setMessage("체험 화면입니다. 실제 Strava 동기화는 로그인 후 사용할 수 있습니다.");
				return;
			}

			const result = await syncActivities({
				onProgress: (progress) => setMessage(progress.message),
			});
			const synced = await getStoredActivities();
			const existing = await boostRequest<{ garage: Garage; revision: number }>("garage");
			const gearIds = [
				...new Set(
					synced
						.filter(isRide)
						.map((a) => a.gear_id)
						.filter((id): id is string => Boolean(id)),
				),
			];
			const missing = gearIds.filter(
				(id) => !existing.garage.bikes.some((b) => b.stravaGearId === id),
			);
			if (missing.length) {
				const infos = await getGearInfos(missing);
				const next = {
					...existing.garage,
					bikes: [
						...existing.garage.bikes,
						...missing.map((id) => ({
							id: crypto.randomUUID(),
							name: infos.get(id)?.name ?? "이름을 지정할 자전거",
							stravaGearId: id,
						})),
					],
				};
				await boostRequest("garage", {
					method: "PUT",
					body: JSON.stringify({ garage: next, revision: existing.revision }),
				});
			}
			await load();
			setMessage(`${result.count}개 활동을 동기화했습니다.`);
		} catch (e) {
			setError(e instanceof Error ? e.message : "동기화에 실패했습니다.");
		} finally {
			setSyncing(false);
		}
	}
	function navigate(next: View) {
		if (
			dirty.current &&
			!window.confirm("아직 적용하지 않은 조합이 있습니다. 다른 화면으로 이동할까요?")
		)
			return;
		dirty.current = false;
		setView(next);
	}
	function openActivity(a: StravaActivity) {
		if (
			dirty.current &&
			!window.confirm("아직 적용하지 않은 조합이 있습니다. 다른 라이딩을 열까요?")
		)
			return;
		const assigned = assignmentFor(garage, a);
		setActivityId(a.id);
		if (assigned) setBikeId(assigned.bikeId);
		dirty.current = false;
		setView("garage");
	}
	async function logout() {
		if (!demo) {
			await clearAuth();
			await dbUtils.clearTokens();
			await dbUtils.clearActivities();
		}
		window.location.href = "/";
	}
	function editPart(id: string) {
		setPartId(id);
		setModal("part");
	}
	function rideRow(a: StravaActivity) {
		return (
			<button className="boost-ride-row" type="button" key={a.id} onClick={() => openActivity(a)}>
				<span>
					<small>
						{new Date(a.start_date).toLocaleDateString("ko-KR")} ·{" "}
						{garage.bikes.find((b) => b.id === assignmentFor(garage, a)?.bikeId)?.name ??
							"자전거 확인 필요"}
					</small>
					<strong>{a.name}</strong>
					<small>
						{garage.assignments.some((x) => x.activityId === a.id)
							? "사용 부품 확인 완료"
							: "사용 부품 확인하기"}
					</small>
				</span>
				<b>
					{(a.distance / 1000).toFixed(1)}
					<small> km</small>
				</b>
				<ChevronRight size={18} />
			</button>
		);
	}
	return (
		<SaveErrorContext.Provider value={error}>
			<div className="boost-app">
				<header className="boost-header">
					<Link
						href="/"
						onClick={(event) => {
							if (
								dirty.current &&
								!window.confirm("적용하지 않은 조합을 버리고 홈으로 돌아갈까요?")
							)
								event.preventDefault();
						}}
						className="boost-logo"
						aria-label="Trace 홈"
					>
						Trace<span>스트라바 활동 통계</span>
					</Link>
					<div className="boost-header-actions">
						{demo ? (
							<Link href="/" className="boost-text">
								체험 종료
							</Link>
						) : session?.athleteId ? (
							<>
								<button
									type="button"
									className="boost-icon"
									onClick={sync}
									disabled={syncing || busy}
									aria-label="Strava 동기화"
								>
									<RefreshCw size={19} className={syncing ? "boost-spinning" : ""} />
								</button>
								<button
									type="button"
									className="boost-icon"
									aria-label="로그아웃"
									onClick={() => void logout().catch((e) => setError(e.message))}
								>
									<LogOut size={18} />
								</button>
							</>
						) : (
							<span className="boost-muted">라이딩과 장비의 기록</span>
						)}
					</div>
				</header>
				<SiteNavigation
					active="equipment"
					onNavigate={() =>
						!dirty.current || window.confirm("적용하지 않은 조합을 버리고 이동할까요?")
					}
				/>
				{session?.athleteId && (
					<nav className="boost-nav" aria-label="주 메뉴">
						{(
							[
								["home", "정비 현황"],
								["garage", "내 장비"],
								["rides", "라이딩별 조합"],
							] as const
						).map(([id, label]) => (
							<button
								type="button"
								key={id}
								aria-current={view === id ? "page" : undefined}
								onClick={() => navigate(id)}
							>
								{label}
							</button>
						))}
					</nav>
				)}
				<main className="boost-main">
					{demo && (
						<div className="boost-demo-label">
							체험용 데이터 · 변경은 실제 기록에 반영되지 않습니다.
						</div>
					)}
					{error && (
						<div role="alert" className="boost-error">
							{error}
							<button
								type="button"
								className="boost-text"
								onClick={() => {
									if (
										!dirty.current ||
										window.confirm("적용하지 않은 변경을 버리고 최신 기록을 불러올까요?")
									) {
										dirty.current = false;
										setLoading(true);
										load()
											.then(() => setError(""))
											.catch((e) => setError(e.message))
											.finally(() => setLoading(false));
									}
								}}
							>
								최신 기록 다시 불러오기
							</button>
						</div>
					)}
					{message && (
						<output aria-live="polite" className="boost-feedback">
							{message}
						</output>
					)}
					{loading ? (
						<div className="boost-empty">
							<RefreshCw className="boost-spinning" />
							<p>라이딩과 장비 기록을 불러오고 있습니다.</p>
						</div>
					) : !session?.athleteId ? (
						<section className="boost-welcome">
							<div className="boost-welcome-symbol">
								<BikeIcon size={60} strokeWidth={1.25} />
							</div>
							<p className="boost-eyebrow">라이딩 뒤에도 기록은 이어집니다</p>
							<h1>내 자전거의 모든 순간.</h1>
							<p>
								함께 달린 부품, 마지막 왁싱, 다음 정비까지.
								<br />
								여러 대의 자전거와 수많은 조합을 한곳에서 관리하세요.
							</p>
							<button
								type="button"
								onClick={() => {
									window.location.href = getAuthUrl();
								}}
								className="boost-primary"
							>
								Strava로 시작하기
							</button>
							<Link href="/demo" className="boost-secondary">
								장비 작업대 둘러보기
							</Link>
							{!session?.configured && (
								<p className="boost-setup">
									장비 기록을 사용하려면 서버에 Supabase 연결과 장비 스키마 설정이 필요합니다.
								</p>
							)}
							<Link href="/" className="boost-text">
								라이딩 통계로 돌아가기
							</Link>
						</section>
					) : (
						<>
							{view === "home" && (
								<>
									<div className="boost-page-title">
										<div>
											<p className="boost-eyebrow">내 라이딩과 장비의 오늘</p>
											<h1>타고, 살피고, 다시 타기.</h1>
										</div>
										<button
											type="button"
											className="boost-secondary"
											onClick={() => navigate("garage")}
										>
											<Wrench size={17} />
											장비 작업대
										</button>
									</div>
									<Maintenance garage={garage} activities={activities} save={save} busy={busy} />
									<section className="boost-recent">
										<div className="boost-section-head">
											<h2>최근 라이딩</h2>
											<button
												className="boost-text"
												type="button"
												onClick={() => navigate("rides")}
											>
												전체 보기 <ChevronRight size={15} />
											</button>
										</div>
										{rides.slice(0, 3).map(rideRow)}
										{!rides.length && (
											<div className="boost-empty">
												<p>Strava 활동을 가져와 첫 라이딩을 확인하세요.</p>
												<button
													type="button"
													className="boost-primary"
													disabled={syncing}
													onClick={sync}
												>
													{syncing ? "가져오는 중…" : "라이딩 가져오기"}
												</button>
											</div>
										)}
									</section>
								</>
							)}
							{view === "garage" && (
								<>
									<div className="boost-page-title">
										<div>
											<p className="boost-eyebrow">자전거는 단순하게, 조합은 자유롭게</p>
											<h1>내 장비 작업대</h1>
										</div>
										<div className="boost-toolbar">
											<button
												type="button"
												className="boost-secondary"
												onClick={() => {
													setEditingBike(undefined);
													setModal("bike");
												}}
											>
												<Plus size={16} />
												자전거
											</button>
											<button
												type="button"
												className="boost-primary"
												onClick={() => {
													setPartId(undefined);
													setModal("part");
												}}
											>
												<Plus size={16} />
												부품 등록
											</button>
										</div>
									</div>
									{!garage.bikes.length ? (
										<div className="boost-empty">
											<BikeIcon size={42} />
											<h2>먼저 자전거를 등록하세요.</h2>
											<p>Strava에서 가져오거나 직접 등록할 수 있습니다.</p>
											<button
												type="button"
												className="boost-primary"
												disabled={syncing}
												onClick={sync}
											>
												Strava 자전거 가져오기
											</button>
										</div>
									) : (
										<>
											<div className="boost-workbench-controls">
												<label className="boost-field">
													자전거
													<select
														value={bikeId}
														onChange={(e) => {
															if (
																!dirty.current ||
																window.confirm("적용하지 않은 조합을 버리고 자전거를 바꿀까요?")
															)
																setBikeId(e.target.value);
														}}
													>
														{garage.bikes.map((b) => (
															<option key={b.id} value={b.id}>
																{b.name}
															</option>
														))}
													</select>
												</label>
												<label className="boost-field">
													수정할 기록
													<select
														value={activityId ?? "current"}
														onChange={(e) => {
															if (
																dirty.current &&
																!window.confirm("적용하지 않은 조합을 버리고 기록을 바꿀까요?")
															)
																return;
															if (e.target.value === "current") setActivityId(null);
															else {
																const a = activities.find((a) => a.id === Number(e.target.value));
																if (a) {
																	dirty.current = false;
																	openActivity(a);
																}
															}
														}}
													>
														<option value="current">현재 장착 상태</option>
														{rides.map((a) => (
															<option key={a.id} value={a.id}>
																{new Date(a.start_date).toLocaleDateString("ko-KR")} · {a.name}
															</option>
														))}
													</select>
												</label>
											</div>
											<button
												type="button"
												className="boost-text"
												onClick={() => {
													setEditingBike(bikeId);
													setModal("bike");
												}}
											>
												자전거 이름·Strava 연결 수정
											</button>
											<Workbench
												garage={garage}
												activities={activities}
												activity={activity}
												bikeId={bikeId}
												save={save}
												busy={busy || syncing}
												editPart={editPart}
												onDirty={(value) => {
													dirty.current = value;
												}}
											/>
											{activity && (
												<div className="boost-external-actions">
													<Link
														href={demo ? "/demo" : `/activity/${activity.id}`}
														className="boost-text"
													>
														{demo ? "체험 데이터" : "경로·고도 프로필 보기"}
													</Link>
												</div>
											)}
										</>
									)}
									<section className="boost-inventory">
										<div className="boost-section-head">
											<h2>
												모든 부품 <span className="boost-count">{garage.parts.length}</span>
											</h2>
										</div>
										{garage.parts.map((p) => (
											<button
												type="button"
												className="boost-inventory-row"
												key={p.id}
												onClick={() => editPart(p.id)}
											>
												<PartIcon kind={p.kind} />
												<span>
													<strong>{p.name}</strong>
													<small>
														{kindLabels[p.kind]} ·{" "}
														{new Date(p.startedAt).toLocaleDateString("ko-KR")}
														부터{p.retiredAt ? " · 사용 종료" : ""}
													</small>
												</span>
												<b>
													{partDistance(garage, activities, p.id).toLocaleString("ko-KR", {
														maximumFractionDigits: 1,
													})}
													km
												</b>
												<ChevronRight size={16} />
											</button>
										))}
										{!garage.parts.length && (
											<p className="boost-empty-small">
												타이어 두 개도 각각 등록해 사용 이력을 따로 추적하세요.
											</p>
										)}
									</section>
								</>
							)}
							{view === "rides" && (
								<>
									<div className="boost-page-title">
										<div>
											<p className="boost-eyebrow">기록과 장비를 한곳에</p>
											<h1>라이딩</h1>
										</div>
										{!demo && (
											<Link href="/" className="boost-secondary">
												기간별 통계 보기
											</Link>
										)}
									</div>
									<label className="boost-field boost-search">
										라이딩 검색
										<input
											type="search"
											value={filter}
											onChange={(e) => setFilter(e.target.value)}
											placeholder="라이딩 이름으로 검색"
										/>
									</label>
									{rides
										.filter((a) => a.name.toLocaleLowerCase().includes(filter.toLocaleLowerCase()))
										.map(rideRow)}
									{!rides.length && (
										<div className="boost-empty">
											<p>아직 동기화한 라이딩이 없습니다.</p>
											<button
												type="button"
												className="boost-primary"
												disabled={syncing}
												onClick={sync}
											>
												라이딩 가져오기
											</button>
										</div>
									)}
								</>
							)}
						</>
					)}
				</main>
				{modal === "bike" && (
					<BikeForm
						key={editingBike ?? "new-bike"}
						bikeId={editingBike}
						garage={garage}
						save={save}
						close={() => setModal(null)}
						busy={busy}
					/>
				)}
				{modal === "part" && (
					<PartForm
						key={partId ?? "new"}
						garage={garage}
						activities={activities}
						save={save}
						close={() => setModal(null)}
						busy={busy}
						partId={partId}
					/>
				)}
			</div>
		</SaveErrorContext.Provider>
	);
}
