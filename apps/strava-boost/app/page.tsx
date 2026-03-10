"use client";

import { useEffect, useMemo, useState } from "react";
import { ActivityFilters as ActivityFiltersComponent } from "@/components/ActivityFilters";
import { ActivityList } from "@/components/ActivityList";
import { OverallStats } from "@/components/OverallStats";
import { YearlyStats } from "@/components/YearlyStats";
import { useAuth } from "@/hooks/useAuth";
import { type ActivityFilters, filterActivities } from "@/lib/filters";
import { calculateStats } from "@/lib/stats";
import type { SyncProgress } from "@/lib/sync";
import { getLastSyncTime, getStoredActivities, syncActivities } from "@/lib/sync";
import type { StravaActivity } from "@/src/types";

export default function Home() {
	const { isAuthenticated, isLoading, login, logout } = useAuth();
	const [syncProgress, setSyncProgress] = useState<SyncProgress>({
		status: "idle",
		current: 0,
		total: null,
		message: "",
	});
	const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
	const [activityCount, setActivityCount] = useState<number>(0);
	const [allActivities, setAllActivities] = useState<StravaActivity[]>([]);
	const [filters, setFilters] = useState<ActivityFilters>({});
	const [showSyncDialog, setShowSyncDialog] = useState(false);
	const [selectedYears, setSelectedYears] = useState<string[]>([]);
	const [showStickyNav, setShowStickyNav] = useState(false);
	const [isSyncInfoLoaded, setIsSyncInfoLoaded] = useState(false);

	const loadSyncInfo = async () => {
		const syncTime = await getLastSyncTime();
		setLastSyncTime(syncTime);
		const activities = await getStoredActivities();
		setAllActivities(activities);
		setActivityCount(activities.length);
		setIsSyncInfoLoaded(true);
	};

	useEffect(() => {
		if (isAuthenticated) {
			loadSyncInfo();
		}
	}, [isAuthenticated]);

	// 동기화 제안 (최초 또는 24시간 경과)
	useEffect(() => {
		if (isAuthenticated && isSyncInfoLoaded) {
			if (!lastSyncTime) {
				// 최초 동기화 제안
				setShowSyncDialog(true);
			} else if (activityCount > 0) {
				// 24시간 경과 체크
				const hoursSinceLastSync = (Date.now() - lastSyncTime.getTime()) / (1000 * 60 * 60);
				if (hoursSinceLastSync >= 24) {
					setShowSyncDialog(true);
				}
			}
		}
	}, [isAuthenticated, isSyncInfoLoaded, lastSyncTime, activityCount]);

	// 스크롤 감지 - 모바일에서 sticky navigation 표시
	useEffect(() => {
		const handleScroll = () => {
			// 300px 이상 스크롤 시 sticky nav 표시
			setShowStickyNav(window.scrollY > 300);
		};

		window.addEventListener("scroll", handleScroll);
		return () => window.removeEventListener("scroll", handleScroll);
	}, []);

	const handleSync = async (forceFullSync = false) => {
		try {
			setSyncProgress({
				status: "syncing",
				current: 0,
				total: null,
				message: forceFullSync ? "전체 동기화 시작..." : "동기화 시작...",
			});

			await syncActivities(
				{
					onProgress: (progress) => {
						setSyncProgress(progress);
					},
				},
				{ forceFullSync },
			);

			// 동기화 완료 후 정보 갱신
			await loadSyncInfo();
		} catch (error) {
			console.error("동기화 오류:", error);
			// 에러 발생 시에도 정보 갱신 시도
			await loadSyncInfo();
		}
	};

	const formatDate = (date: Date | null): string => {
		if (!date) return "없음";
		return new Intl.DateTimeFormat("ko-KR", {
			year: "numeric",
			month: "long",
			day: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		}).format(date);
	};

	// 연도 선택 토글
	const handleYearSelect = (year: string) => {
		setSelectedYears((prev) =>
			prev.includes(year) ? prev.filter((y) => y !== year) : [...prev, year],
		);
	};

	// 연도 선택 해제
	const handleClearYears = () => {
		setSelectedYears([]);
	};

	// 섹션으로 스크롤
	const scrollToSection = (sectionId: string) => {
		const element = document.getElementById(sectionId);
		if (element) {
			// sticky nav의 높이만큼 offset을 추가하여 스크롤
			const yOffset = -60; // sticky nav 높이 + 여유 공간
			const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
			window.scrollTo({ top: y, behavior: "smooth" });
		}
	};

	// 필터링된 활동 및 통계 계산
	const filteredActivities = useMemo(() => {
		let activities = filterActivities(allActivities, filters);

		// 선택된 연도가 있으면 추가 필터링
		if (selectedYears.length > 0) {
			activities = activities.filter((a) =>
				selectedYears.includes(new Date(a.start_date_local).getFullYear().toString()),
			);
		}

		return activities;
	}, [allActivities, filters, selectedYears]);

	const stats = useMemo(() => {
		return calculateStats(filteredActivities);
	}, [filteredActivities]);

	if (isLoading) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
			</div>
		);
	}

	if (!isAuthenticated) {
		return (
			<div className="flex items-center justify-center min-h-screen p-4">
				<div className="text-center max-w-md w-full">
					<div className="flex flex-col items-center justify-center mb-6">
						<h1 className="text-3xl sm:text-4xl font-bold text-[#03B3FD]">Trace</h1>
						<span className="text-base text-gray-500 font-medium mt-1">스트라바 활동 통계</span>
					</div>
					<p className="text-gray-600 mb-8 text-sm sm:text-base">
						Strava 계정으로 로그인하여 라이딩 통계를 확인하세요.
					</p>
					<button
						onClick={login}
						className="w-full sm:w-auto px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-semibold"
					>
						Strava로 로그인
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className="container mx-auto p-4 sm:p-6 max-w-4xl lg:max-w-7xl">
			{/* Sticky Navigation Bar - 모바일 전용 */}
			{showStickyNav && (
				<div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 shadow-md">
					<div className="flex items-center justify-around px-2 py-2 text-xs sm:text-sm">
						<button
							onClick={() => scrollToSection("filters")}
							className="flex flex-col items-center gap-0.5 px-2 py-1.5 hover:bg-gray-100 rounded-md touch-manipulation transition-colors"
						>
							<svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
								/>
							</svg>
							<span>필터</span>
						</button>
						<button
							onClick={() => scrollToSection("stats")}
							className="flex flex-col items-center gap-0.5 px-2 py-1.5 hover:bg-gray-100 rounded-md touch-manipulation transition-colors"
						>
							<svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
								/>
							</svg>
							<span>통계</span>
						</button>
						<button
							onClick={() => scrollToSection("yearly")}
							className="flex flex-col items-center gap-0.5 px-2 py-1.5 hover:bg-gray-100 rounded-md touch-manipulation transition-colors"
						>
							<svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
								/>
							</svg>
							<span>연도</span>
						</button>
						<button
							onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
							className="flex flex-col items-center gap-0.5 px-2 py-1.5 hover:bg-gray-100 rounded-md touch-manipulation transition-colors"
						>
							<svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M5 10l7-7m0 0l7 7m-7-7v18"
								/>
							</svg>
							<span>맨위</span>
						</button>
					</div>
				</div>
			)}

			{/* 헤더 */}
			<div className="flex justify-between items-center mb-2">
				<div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2">
					<h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#03B3FD]">Trace</h1>
					<span className="text-xs sm:text-sm text-gray-500 font-medium">스트라바 활동 통계</span>
				</div>
				<div className="flex items-center gap-2">
					<button
						onClick={() => handleSync(false)}
						disabled={syncProgress.status === "syncing"}
						className="p-2 text-gray-600 hover:text-blue-600 disabled:text-gray-400 transition-colors"
						title="동기화"
					>
						{syncProgress.status === "syncing" ? (
							<svg
								className="animate-spin h-5 w-5"
								xmlns="http://www.w3.org/2000/svg"
								fill="none"
								viewBox="0 0 24 24"
							>
								<circle
									className="opacity-25"
									cx="12"
									cy="12"
									r="10"
									stroke="currentColor"
									strokeWidth="4"
								></circle>
								<path
									className="opacity-75"
									fill="currentColor"
									d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
								></path>
							</svg>
						) : (
							<svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
								/>
							</svg>
						)}
					</button>
					<button
						onClick={logout}
						className="text-sm text-gray-600 hover:text-gray-900 transition-colors px-2 py-1"
						title="로그아웃"
					>
						로그아웃
					</button>
				</div>
			</div>

			{/* 마지막 동기화 시점 */}
			<div className="text-xs text-gray-500 mb-4">
				<span>마지막 동기화: {formatDate(lastSyncTime)}</span>
				{!lastSyncTime && (
					<button
						onClick={() => handleSync(false)}
						disabled={syncProgress.status === "syncing"}
						className="ml-1 text-blue-600 hover:text-blue-800 hover:underline disabled:text-gray-400 disabled:no-underline"
					>
						(지금 동기화)
					</button>
				)}
				{activityCount > 0 && ` · ${activityCount}개 활동`}
			</div>

			{/* 동기화 진행바 - 동기화 중일 때만 표시 */}
			{syncProgress.status === "syncing" && (
				<div className="bg-white rounded-lg shadow p-4 mb-4">
					<div className="flex items-center justify-between mb-2">
						<span className="text-sm text-gray-600">{syncProgress.message}</span>
						{syncProgress.total !== null && (
							<span className="text-sm text-gray-600">
								{syncProgress.current} / {syncProgress.total}
							</span>
						)}
					</div>
					{syncProgress.total !== null && (
						<div className="w-full bg-gray-200 rounded-full h-2">
							<div
								className="bg-blue-500 h-2 rounded-full transition-all duration-300"
								style={{
									width: `${(syncProgress.current / syncProgress.total) * 100}%`,
								}}
							></div>
						</div>
					)}
				</div>
			)}

			{/* 성공 메시지 */}
			{syncProgress.status === "success" && (
				<div className="bg-green-50 border border-green-200 rounded p-3 mb-4">
					<p className="text-sm text-green-800">{syncProgress.message}</p>
				</div>
			)}

			{/* 에러 메시지 */}
			{syncProgress.status === "error" && (
				<div className="bg-red-50 border border-red-200 rounded p-3 mb-4">
					<p className="text-sm text-red-800">{syncProgress.error}</p>
				</div>
			)}

			{/* 자동 동기화 제안 다이얼로그 */}
			{showSyncDialog && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
					<div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
						<h3 className="text-lg font-semibold mb-2">데이터 동기화</h3>
						<p className="text-gray-600 mb-4">
							{!lastSyncTime
								? "Strava 데이터를 동기화하여 통계를 확인하시겠습니까?"
								: "마지막 동기화 이후 24시간이 지났습니다. 새로운 활동을 가져오시겠습니까?"}
						</p>
						<div className="flex gap-2 justify-end">
							<button
								onClick={() => setShowSyncDialog(false)}
								className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded transition-colors"
							>
								나중에
							</button>
							<button
								onClick={() => {
									setShowSyncDialog(false);
									handleSync(false);
								}}
								className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
							>
								동기화
							</button>
						</div>
					</div>
				</div>
			)}

			{/* 필터 */}
			<div id="filters" className="mb-4 sm:mb-6">
				<ActivityFiltersComponent
					activities={allActivities}
					filters={filters}
					onFiltersChange={setFilters}
				/>
			</div>

			{/* 전체 통계 - 전체 너비 */}
			<div id="stats" className="mb-4 sm:mb-6">
				<OverallStats stats={stats} />
			</div>

			{/* 연도별 통계 및 활동 목록 - 데스크탑에서 2컬럼 레이아웃 */}
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
				{/* 연도별 통계 */}
				<div id="yearly" className="lg:col-span-1">
					<YearlyStats
						stats={stats}
						selectedYears={selectedYears}
						onYearSelect={handleYearSelect}
						onClearSelection={handleClearYears}
					/>
				</div>

				{/* 활동 목록 */}
				<div className="lg:col-span-2">
					<ActivityList activities={filteredActivities} />
				</div>
			</div>
		</div>
	);
}
