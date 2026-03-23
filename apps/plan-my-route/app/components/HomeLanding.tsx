"use client";

import { Badge, Button } from "@my-ridings/ui";
import {
	AlertTriangle,
	BarChart3,
	Bike,
	Bookmark,
	CheckCircle,
	ClipboardList,
	Coffee,
	Home,
	Lightbulb,
	Link as LinkIcon,
	Map,
	MapPin,
	MoveVertical,
	Store,
	Target,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { HeroRouteBackground } from "./HeroRouteBackground";
import { PlanMyRouteHeader } from "./PlanMyRouteHeader";

const SIGN_IN_HREF = `/signin?callbackUrl=${encodeURIComponent("/")}`;

const COPY = {
	hero: {
		badge: "멀티데이 라이딩 전략 도구",
		headline: "경로는 정했다.\n이제 전략을 짜야 할 시간.",
		body: "경로를 보면서 카카오맵으로 숙소와 보급 지점을 찾고, 플랜을 만들어 비교하세요.\n분산된 탐색 과정을 하나의 흐름으로 통합했습니다.",
		cta: "지금 시작하기",
		ctaSub: "어떻게 작동하나요?",
	},
	problems: [
		{
			type: "problem" as const,
			title: "해외 지도는 한국 로컬 정보가 부족하다",
			desc: "OSM 기반 지도에서는 한국 편의점·민박·펜션 등의 정보가 누락되거나 부정확한 경우가 많다",
		},
		{
			type: "problem" as const,
			title: "이중 탐색의 피로",
			desc: "경로 앱 → 지도 앱 → 메모장을 오가다 보면 정작 전략 수립에 집중하기 어렵다",
		},
		{
			type: "solution" as const,
			title: "카카오맵 기반 로컬 POI, 경로와 함께",
			desc: "숙소·편의점·마트·카페를 지도 위에서 바로 찾고, 북마크로 후보를 관리한다",
		},
		{
			type: "result" as const,
			title: "현실적인 멀티데이 전략을 더 빠르게",
			desc: "일자별 스테이지를 여러 안으로 설계하고 비교해 완주 가능성 높은 계획을 선택한다",
		},
	],
	steps: [
		{
			step: "01",
			title: "경로 불러오기",
			desc: "RideWithGPS 경로 URL을 등록하면 거리·고도 데이터가 자동으로 연동됩니다.",
			tag: "RideWithGPS URL",
			icon: LinkIcon,
		},
		{
			step: "02",
			title: "복수 플랜 작성",
			desc: "같은 경로에 대해 여러 개의 플랜을 만들고, 각 플랜의 일자별 스테이지를 설정합니다.",
			tag: "플랜 비교",
			icon: ClipboardList,
		},
		{
			step: "03",
			title: "현지 정보 탐색 & 북마크",
			desc: "카카오맵으로 경로 주변 숙소·보급 지점을 탐색하고 즐겨찾기해 후보를 모아둡니다.",
			tag: "카카오맵 즐겨찾기",
			icon: Bookmark,
		},
		{
			step: "04",
			title: "최적안 확정",
			desc: "스테이지별 거리·고도와 즐겨찾기한 숙소를 확인하며 가장 현실적인 플랜을 선택합니다.",
			tag: "완주 전략",
			icon: Bike,
		},
	],
};

function MockRouteList() {
	return (
		<div className="overflow-hidden rounded-xl border border-gray-200 bg-white text-left shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
			<div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-800">
				<span className="text-sm font-semibold text-gray-700 dark:text-zinc-200">
					내 라이딩 경로
				</span>
				<Button size="sm" className="h-7 text-xs">
					+ 경로 추가
				</Button>
			</div>
			{[
				{ name: "동해안 종주", dist: "412km", days: "4일", elev: "3,820m" },
				{ name: "국토종주 자전거길", dist: "633km", days: "6일", elev: "5,210m" },
				{ name: "제주 일주", dist: "234km", days: "2일", elev: "1,640m" },
			].map((r, i) => (
				<div
					key={r.name}
					className="flex items-center justify-between border-b border-gray-100 px-4 py-3 transition-colors last:border-0 hover:bg-gray-50 dark:border-zinc-800 dark:hover:bg-zinc-800/80"
				>
					<div>
						<p className="text-sm font-semibold text-gray-900 dark:text-zinc-100">{r.name}</p>
						<p className="text-xs text-gray-500 dark:text-zinc-400">
							{r.dist} · 고도 {r.elev}
						</p>
					</div>
					<div className="flex items-center gap-2">
						<Badge
							variant="secondary"
							className="border border-indigo-100 bg-indigo-50 text-xs text-indigo-600 dark:border-indigo-900 dark:bg-indigo-950/50 dark:text-indigo-300"
						>
							{r.days}
						</Badge>
						<span className="text-base text-gray-400">›</span>
					</div>
				</div>
			))}
		</div>
	);
}

function MockPlanMap() {
	return (
		<div className="overflow-hidden rounded-xl border border-gray-200 bg-white text-left shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
			<div className="flex items-center gap-2 border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-800">
				<span className="text-sm font-semibold text-gray-700 dark:text-zinc-200">
					동해안 종주 — 플랜 A
				</span>
				<Badge
					variant="secondary"
					className="ml-auto border border-emerald-200 bg-emerald-50 text-xs text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300"
				>
					4스테이지
				</Badge>
			</div>
			<div className="relative flex h-32 items-center justify-center overflow-hidden bg-gradient-to-br from-blue-50 via-emerald-50 to-teal-100 dark:from-blue-950/40 dark:via-emerald-950/30 dark:to-teal-950/40">
				<svg viewBox="0 0 240 80" className="absolute inset-0 h-full w-full opacity-30" aria-hidden>
					<path
						d="M10,60 Q60,20 120,40 Q170,55 230,25"
						fill="none"
						stroke="#6366F1"
						strokeDasharray="6,3"
						strokeWidth="2.5"
					/>
				</svg>
				{[
					{ x: "8%", y: "68%", color: "#22C55E", label: "출발" },
					{ x: "32%", y: "28%", color: "#6366F1", label: "D1" },
					{ x: "58%", y: "48%", color: "#6366F1", label: "D2" },
					{ x: "80%", y: "33%", color: "#6366F1", label: "D3" },
					{ x: "93%", y: "20%", color: "#EF4444", label: "도착" },
				].map((p) => (
					<div
						key={p.label}
						className="absolute flex flex-col items-center"
						style={{ left: p.x, top: p.y, transform: "translate(-50%,-50%)" }}
					>
						<div
							className="h-3 w-3 rounded-full border-2 border-white shadow"
							style={{ background: p.color }}
						/>
						<span className="mt-0.5 text-[9px] font-bold text-white drop-shadow">{p.label}</span>
					</div>
				))}
				<span className="z-10 text-[0.7rem] text-gray-600 opacity-80 dark:text-zinc-300">
					카카오맵 기반
				</span>
			</div>
			<div className="divide-y divide-gray-100 dark:divide-zinc-800">
				{[
					{ label: "Day 1", route: "강릉 → 삼척", dist: "68km", elev: "+820m" },
					{ label: "Day 2", route: "삼척 → 울진", dist: "112km", elev: "+940m" },
				].map((s) => (
					<div key={s.label} className="flex items-center justify-between px-4 py-2.5">
						<div className="flex items-center gap-2">
							<span className="flex h-5 w-5 items-center justify-center rounded bg-indigo-100 text-[0.65rem] font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
								{s.label.replace("Day ", "D")}
							</span>
							<span className="text-sm text-gray-700 dark:text-zinc-200">{s.route}</span>
						</div>
						<div className="flex gap-2">
							<span className="text-xs text-gray-500 dark:text-zinc-400">{s.dist}</span>
							<span className="text-xs text-emerald-600 dark:text-emerald-400">{s.elev}</span>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}

function MockStageSearch() {
	return (
		<div className="overflow-hidden rounded-xl border border-gray-200 bg-white text-left shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
			<div className="flex items-center gap-2 border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-800">
				<span className="text-sm font-semibold text-gray-700 dark:text-zinc-200">
					Day 2 종점 주변 탐색
				</span>
				<Badge
					variant="secondary"
					className="ml-auto border border-yellow-200 bg-yellow-50 text-xs text-yellow-700 dark:border-yellow-900 dark:bg-yellow-950/40 dark:text-yellow-300"
				>
					카카오맵
				</Badge>
			</div>
			<div className="flex gap-1.5 overflow-x-auto border-b border-gray-100 px-4 py-2 dark:border-zinc-800">
				{[
					{ label: "숙소", icon: Home },
					{ label: "편의점", icon: Store },
					{ label: "마트", icon: Store },
					{ label: "카페", icon: Coffee },
				].map((cat, i) => {
					const Icon = cat.icon;
					return (
						<Badge
							key={cat.label}
							variant={i === 0 ? "default" : "outline"}
							className={`whitespace-nowrap text-xs ${
								i === 0
									? "border-indigo-200 bg-indigo-100 text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950 dark:text-indigo-200"
									: "dark:border-zinc-600 dark:text-zinc-200"
							}`}
						>
							<Icon className="mr-1 h-3 w-3" aria-hidden />
							{cat.label}
						</Badge>
					);
				})}
			</div>
			{[
				{ name: "울진 해변 펜션", dist: "1.2km", type: "숙소", bookmarked: true },
				{ name: "온양리 게스트하우스", dist: "2.4km", type: "숙소", bookmarked: false },
				{ name: "덕구온천 리조트", dist: "3.8km", type: "숙소", bookmarked: false },
			].map((p) => (
				<div
					key={p.name}
					className="flex items-center justify-between border-b border-gray-50 px-4 py-2.5 last:border-0 dark:border-zinc-800"
				>
					<div>
						<p className="text-sm font-medium text-gray-900 dark:text-zinc-100">{p.name}</p>
						<p className="text-xs text-gray-400 dark:text-zinc-500">
							{p.type} · {p.dist}
						</p>
					</div>
					<span
						className={`flex h-7 w-7 items-center justify-center rounded-full border text-sm transition-colors ${
							p.bookmarked
								? "border-yellow-300 bg-yellow-100 text-yellow-600"
								: "border-gray-200 bg-gray-50 text-gray-400 dark:border-zinc-600 dark:bg-zinc-800"
						}`}
						aria-hidden
					>
						{p.bookmarked ? "★" : "☆"}
					</span>
				</div>
			))}
		</div>
	);
}

export default function HomeLanding() {
	const [activeTab, setActiveTab] = useState(0);

	const scrollToSection = (id: string) => {
		document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
	};

	const previewTabs = [
		{ label: "경로 목록", component: <MockRouteList /> },
		{ label: "플랜 & 지도", component: <MockPlanMap /> },
		{ label: "숙소 탐색", component: <MockStageSearch /> },
	];

	return (
		<div className="min-h-screen bg-white text-gray-900 dark:bg-zinc-950 dark:text-zinc-50">
			<PlanMyRouteHeader />

			<section className="relative overflow-hidden bg-white dark:bg-zinc-950">
				<HeroRouteBackground />

				<div className="absolute right-10 top-20 opacity-50" aria-hidden>
					<div
						className="h-16 w-16 rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-100 to-purple-100 dark:border-indigo-800 dark:from-indigo-950 dark:to-purple-950"
						style={{ animation: "float 6s ease-in-out infinite" }}
					/>
				</div>
				<div className="absolute bottom-32 left-10 opacity-40" aria-hidden>
					<div
						className="h-12 w-12 rounded-xl border border-pink-200 bg-gradient-to-br from-pink-100 to-rose-100 dark:border-pink-900 dark:from-pink-950 dark:to-rose-950"
						style={{ animation: "float 8s ease-in-out infinite 1s" }}
					/>
				</div>

				<div className="relative mx-auto max-w-4xl px-4 py-24 sm:px-6 sm:py-32">
					<div className="relative mb-6 inline-flex items-center gap-2 overflow-hidden rounded-full border-2 border-slate-200 bg-slate-50 px-4 py-2 dark:border-zinc-700 dark:bg-zinc-900">
						<div
							className="absolute inset-0 bg-gradient-to-r from-transparent via-indigo-50 to-transparent dark:via-indigo-950/40"
							style={{ animation: "slideRight 2s ease-in-out infinite" }}
						/>
						<Bike className="relative h-5 w-5 text-indigo-600 dark:text-indigo-400" aria-hidden />
						<span className="relative text-xs font-bold text-indigo-600 dark:text-indigo-400">
							{COPY.hero.badge}
						</span>
					</div>

					<div className="mb-4">
						<h1 className="whitespace-pre-line text-4xl font-black leading-tight tracking-tight sm:text-5xl lg:text-[3.25rem]">
							<span className="text-gray-900 dark:text-zinc-50">경로는 정했다.</span>
							<br />
							<span className="bg-gradient-to-r from-indigo-600 to-pink-600 bg-clip-text text-transparent">
								이제 전략을 짜야 할 시간.
							</span>
						</h1>
					</div>

					<div className="mb-7 flex flex-wrap gap-2">
						{[
							{ label: "경로 연동", icon: LinkIcon },
							{ label: "POI 탐색", icon: MapPin },
							{ label: "플랜 비교", icon: ClipboardList },
							{ label: "전략 확정", icon: CheckCircle },
						].map((item, i) => {
							const Icon = item.icon;
							const isActive = i === 0;
							return (
								<Badge
									key={item.label}
									variant={isActive ? "default" : "outline"}
									className={
										isActive
											? "cursor-pointer rounded-lg border-transparent bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 dark:bg-indigo-600 dark:text-white dark:hover:bg-indigo-500"
											: "cursor-pointer rounded-lg border border-gray-300 bg-transparent px-4 py-2 text-sm font-semibold text-gray-900 transition-colors hover:border-gray-400 hover:bg-gray-50 dark:border-zinc-500 dark:bg-transparent dark:text-zinc-100 dark:hover:border-zinc-400 dark:hover:bg-zinc-900/50"
									}
									style={{ animation: `fadeInUp 0.6s ease-out ${i * 0.1}s both` }}
								>
									<Icon className="mr-1.5 h-4 w-4" aria-hidden />
									{item.label}
								</Badge>
							);
						})}
					</div>

					<p className="mb-8 max-w-2xl whitespace-pre-line text-[0.9375rem] leading-relaxed text-slate-600 dark:text-zinc-400">
						{COPY.hero.body}
					</p>

					<div className="mb-8 inline-flex items-center gap-2 rounded-full border-2 border-amber-300 bg-amber-50 px-4 py-2.5 dark:border-amber-700 dark:bg-amber-950/40">
						<Map className="h-5 w-5 shrink-0 animate-bounce text-amber-900 dark:text-amber-200" aria-hidden />
						<span className="text-sm font-semibold text-amber-900 dark:text-amber-100">
							카카오맵 기반 · 한국 로컬 숙소·보급 지점 정보 최적화
						</span>
					</div>

					<div className="flex flex-col gap-3 sm:flex-row sm:items-center">
						<Button
							asChild
							size="lg"
							className="h-12 rounded-xl border-0 bg-indigo-600 px-8 text-base font-bold text-white shadow-none hover:bg-indigo-700 dark:bg-indigo-600 dark:text-white dark:hover:bg-indigo-500"
						>
							<Link href={SIGN_IN_HREF} className="inline-flex items-center justify-center">
								{COPY.hero.cta}
							</Link>
						</Button>
						<Button
							type="button"
							variant="outline"
							size="lg"
							onClick={() => scrollToSection("how-it-works")}
							className="h-12 rounded-xl border-2 border-slate-200 bg-slate-50 px-8 text-base font-semibold text-slate-700 hover:border-indigo-500 hover:text-indigo-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-indigo-500 dark:hover:text-indigo-400"
						>
							{COPY.hero.ctaSub} ↓
						</Button>
					</div>
				</div>
			</section>

			<section className="border-y border-gray-100 bg-gray-50 py-16 sm:py-20 dark:border-zinc-800 dark:bg-zinc-900/50">
				<div className="mx-auto max-w-5xl px-4 sm:px-6">
					<div className="mb-10 text-center">
						<p className="mb-2 text-xs font-bold tracking-wider text-indigo-600 dark:text-indigo-400">
							WHY PLAN MY ROUTE
						</p>
						<h2 className="text-2xl font-extrabold tracking-tight text-gray-900 dark:text-zinc-50 sm:text-3xl">
							한국 라이더가 겪는 문제를 직접 풀었습니다
						</h2>
					</div>

					<div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
						{COPY.problems.map((item, i) => {
							const styles = {
								problem: {
									bg: "bg-white dark:bg-zinc-900",
									border: "border-gray-200 dark:border-zinc-700",
									badgeVariant: "destructive" as const,
									icon: AlertTriangle,
									iconBg: "bg-red-50 dark:bg-red-950/40",
									iconColor: "text-red-600 dark:text-red-400",
								},
								solution: {
									bg: "bg-indigo-50 dark:bg-indigo-950/30",
									border: "border-indigo-200 dark:border-indigo-900",
									badgeVariant: "default" as const,
									icon: Lightbulb,
									iconBg: "bg-indigo-100 dark:bg-indigo-950/50",
									iconColor: "text-indigo-700 dark:text-indigo-300",
								},
								result: {
									bg: "bg-emerald-50 dark:bg-emerald-950/30",
									border: "border-emerald-200 dark:border-emerald-900",
									badgeVariant: "secondary" as const,
									icon: Target,
									iconBg: "bg-emerald-100 dark:bg-emerald-950/50",
									iconColor: "text-emerald-700 dark:text-emerald-300",
								},
							}[item.type];

							const Icon = styles.icon;
							const badgeText =
								item.type === "problem"
									? "문제"
									: item.type === "solution"
										? "해결"
										: "결과";

							return (
								<div
									key={i}
									className={`rounded-2xl border p-5 ${styles.bg} ${styles.border}`}
								>
									<div className="flex items-start gap-4">
										<div
											className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${styles.iconBg}`}
										>
											<Icon className={`h-5 w-5 ${styles.iconColor}`} aria-hidden />
										</div>
										<div>
											<Badge variant={styles.badgeVariant} className="mb-2 text-xs">
												{badgeText}
											</Badge>
											<p className="mb-1 text-sm font-bold text-gray-900 dark:text-zinc-100">
												{item.title}
											</p>
											<p className="text-sm leading-relaxed text-gray-600 dark:text-zinc-400">
												{item.desc}
											</p>
										</div>
									</div>
								</div>
							);
						})}
					</div>

					<div className="flex items-start gap-4 rounded-2xl border border-amber-300 bg-amber-50 p-5 dark:border-amber-800 dark:bg-amber-950/30">
						<LinkIcon className="h-6 w-6 shrink-0 text-amber-900 dark:text-amber-200" aria-hidden />
						<div>
							<p className="mb-1 text-[0.9375rem] font-bold text-amber-900 dark:text-amber-100">
								단절된 탐색 과정을 하나로 통합
							</p>
							<p className="text-sm leading-relaxed text-amber-800 dark:text-amber-200/90">
								RideWithGPS / Strava(OSM 기반)에서 경로 확인 → 카카오맵에서 숙소·편의점 탐색 → 메모장에
								후보 기록.{" "}
								<strong className="text-amber-900 dark:text-amber-50">
									이 번거로운 3단계를 Plan My Route 하나로 끝냅니다.
								</strong>
							</p>
						</div>
					</div>
				</div>
			</section>

			<section id="how-it-works" className="bg-white py-16 sm:py-24 dark:bg-zinc-950">
				<div className="mx-auto max-w-5xl px-4 sm:px-6">
					<div className="mb-12 text-center">
						<p className="mb-2 text-xs font-bold tracking-wider text-indigo-600 dark:text-indigo-400">
							HOW IT WORKS
						</p>
						<h2 className="text-2xl font-extrabold tracking-tight text-gray-900 dark:text-zinc-50 sm:text-3xl">
							4단계로 완성하는 멀티데이 라이딩 전략
						</h2>
					</div>

					<div className="mb-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
						{COPY.steps.map((step, i) => {
							const Icon = step.icon;
							return (
								<div key={step.step} className="relative flex flex-col">
									<div className="flex-1 rounded-2xl border border-gray-200 bg-white p-5 transition-all hover:border-indigo-300 hover:shadow-md dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-indigo-700">
										<div className="mb-4 flex items-start justify-between">
											<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-sm font-extrabold text-white">
												{step.step}
											</div>
											<Icon className="h-6 w-6 text-indigo-600 dark:text-indigo-400" aria-hidden />
										</div>
										<Badge
											variant="secondary"
											className="mb-3 border border-indigo-200 bg-indigo-50 text-xs text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950/50 dark:text-indigo-300"
										>
											{step.tag}
										</Badge>
										<h3 className="mb-2 text-[0.9375rem] font-bold text-gray-900 dark:text-zinc-100">
											{step.title}
										</h3>
										<p className="text-sm leading-relaxed text-gray-600 dark:text-zinc-400">
											{step.desc}
										</p>
									</div>
									{i < COPY.steps.length - 1 && (
										<div className="absolute -right-3 top-8 z-10 hidden h-6 w-6 items-center justify-center rounded-full border border-gray-200 bg-white text-xs text-gray-400 lg:flex dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-500">
											→
										</div>
									)}
								</div>
							);
						})}
					</div>

					<div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
						{[
							{ icon: LinkIcon, label: "RideWithGPS URL 등록" },
							{ icon: MapPin, label: "카카오맵 POI 탐색" },
							{ icon: Bookmark, label: "즐겨찾기 북마크" },
							{ icon: ClipboardList, label: "복수 플랜 생성·비교" },
							{ icon: MoveVertical, label: "드래그 앤 드롭 정렬" },
							{ icon: BarChart3, label: "고도 프로파일 확인" },
						].map((f) => {
							const Icon = f.icon;
							return (
								<div
									key={f.label}
									className="flex items-center gap-2.5 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900/80"
								>
									<Icon className="h-4 w-4 text-gray-700 dark:text-zinc-300" aria-hidden />
									<span className="text-sm font-medium text-gray-700 dark:text-zinc-200">
										{f.label}
									</span>
								</div>
							);
						})}
					</div>
				</div>
			</section>

			<section className="border-t border-gray-100 bg-slate-900 py-16 sm:py-24 dark:border-zinc-800">
				<div className="mx-auto max-w-4xl px-4 sm:px-6">
					<div className="mb-10 text-center">
						<p className="mb-2 text-xs font-bold tracking-wider text-indigo-400">PRODUCT PREVIEW</p>
						<h2 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
							실제 화면을 미리 보세요
						</h2>
					</div>

					<div className="mb-6 flex flex-wrap justify-center gap-2">
						{previewTabs.map((tab, i) => (
							<Button
								key={tab.label}
								type="button"
								variant={activeTab === i ? "default" : "ghost"}
								size="sm"
								onClick={() => setActiveTab(i)}
								className={`rounded-full ${
									activeTab === i
										? "bg-indigo-600 text-white hover:bg-indigo-700 dark:hover:bg-indigo-500"
										: "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-300"
								}`}
							>
								{tab.label}
							</Button>
						))}
					</div>

					<div className="overflow-hidden rounded-2xl border border-white/10 shadow-2xl">
						<div className="flex items-center gap-2 bg-slate-800 px-4 py-2.5">
							<div className="flex gap-1.5" aria-hidden>
								<div className="h-3 w-3 rounded-full bg-red-500 opacity-70" />
								<div className="h-3 w-3 rounded-full bg-yellow-500 opacity-70" />
								<div className="h-3 w-3 rounded-full bg-green-500 opacity-70" />
							</div>
							<div className="mx-3 flex-1">
								<div className="mx-auto max-w-[200px] rounded bg-slate-700 px-3 py-1 text-center text-xs text-slate-400">
									planmyroute.app
								</div>
							</div>
						</div>
						<div className="min-h-[260px] bg-slate-50 p-4 sm:p-6 dark:bg-zinc-900">
							{previewTabs[activeTab]?.component}
						</div>
					</div>
				</div>
			</section>

			<section className="bg-white py-16 sm:py-24 dark:bg-zinc-950">
				<div className="mx-auto max-w-2xl px-4 text-center sm:px-6">
					<Bike className="mx-auto mb-5 h-10 w-10 text-indigo-600 dark:text-indigo-400" aria-hidden />
					<h2 className="mb-4 text-2xl font-extrabold tracking-tight text-gray-900 dark:text-zinc-50 sm:text-3xl">
						다음 라이딩을 지금 설계하세요
					</h2>
					<p className="mx-auto mb-8 max-w-md text-[0.9375rem] leading-relaxed text-gray-600 dark:text-zinc-400">
						RideWithGPS 경로와 카카오맵을 하나로 연결해 멀티데이 전략을 더 빠르고 정확하게 세울 수
						있습니다.
					</p>
					<Button
						asChild
						size="lg"
						className="rounded-xl bg-indigo-600 px-8 py-6 text-base font-bold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-700 active:scale-95 dark:hover:bg-indigo-500"
					>
						<Link href={SIGN_IN_HREF} className="inline-flex items-center justify-center rounded-xl px-8 py-6">
							{COPY.hero.cta}
						</Link>
					</Button>
					<p className="mt-3 text-xs text-gray-400 dark:text-zinc-500">
						로그인 후 경로·즐겨찾기·플랜 저장 가능
					</p>
				</div>
			</section>

			<footer className="border-t border-gray-100 bg-gray-50 py-6 dark:border-zinc-800 dark:bg-zinc-900/60">
				<div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 text-xs text-gray-400 sm:flex-row sm:px-6 dark:text-zinc-500">
					<div className="flex items-center gap-2">
						<Map className="h-4 w-4 text-indigo-600 dark:text-indigo-400" aria-hidden />
						<span className="font-semibold text-gray-600 dark:text-zinc-300">Plan My Route</span>
					</div>
					<p className="text-center sm:text-right">
						멀티데이 라이딩 경로 설계 도구 · 한국 라이더를 위해 만들었습니다
					</p>
				</div>
			</footer>
		</div>
	);
}
