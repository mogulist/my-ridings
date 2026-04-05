"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef } from "react";

type SharedPlan = {
	id: number;
	title: string;
	distance: string;
	days: number;
	elevation: string;
	description: string | null;
};

const SHARED_PLANS: SharedPlan[] = [
	{
		id: 1,
		title: "동해안 종주",
		distance: "412km",
		days: 4,
		elevation: "3,820m",
		description:
			"고성에서 부산까지 동해안을 따라 달리는 코스예요. 파도 소리와 해안 절경을 즐기며 라이딩하기 최고입니다.",
	},
	{
		id: 2,
		title: "국토종주 자전거길",
		distance: "633km",
		days: 6,
		elevation: "5,210m",
		description: null,
	},
	{
		id: 3,
		title: "제주 일주",
		distance: "234km",
		days: 2,
		elevation: "1,640m",
		description:
			"제주 해안도로를 시계방향으로 한 바퀴 도는 코스. 첫날 서귀포, 둘째날 제주시 숙박으로 나눴습니다.",
	},
	{
		id: 4,
		title: "새재 자전거길",
		distance: "148km",
		days: 2,
		elevation: "2,100m",
		description: null,
	},
	{
		id: 5,
		title: "백두대간 종주",
		distance: "520km",
		days: 7,
		elevation: "12,400m",
		description:
			"지리산에서 진부령까지 백두대간 능선을 따라 달리는 장거리 코스. 쉽지 않지만 완주하면 평생 기억에 남아요.",
	},
];

export function HomeLandingSharedPlans() {
	const scrollRef = useRef<HTMLDivElement>(null);

	const scroll = (dir: "left" | "right") => {
		if (!scrollRef.current) return;
		const amount = 300;
		scrollRef.current.scrollBy({
			left: dir === "left" ? -amount : amount,
			behavior: "smooth",
		});
	};

	return (
		<section className="bg-white px-6 py-20">
			<div className="mx-auto max-w-6xl">
				<p className="mb-2 text-center text-sm tracking-wide text-[#5842F4]">SHARED PLANS</p>
				<h2 className="text-center text-2xl text-[#020817] md:text-3xl">공유된 라이딩 계획</h2>
				<p className="mt-3 text-center text-sm text-[#64748B] md:text-base">
					다른 라이더의 계획을 살펴보세요. 복사해서 나만의 계획을 만들어보세요
				</p>

				<div className="relative mt-10">
					<button
						type="button"
						aria-label="이전 카드로 스크롤"
						onClick={() => scroll("left")}
						className="absolute -left-4 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-md transition hover:bg-gray-50 md:flex"
					>
						<ChevronLeft className="h-5 w-5 text-gray-600" aria-hidden />
					</button>
					<button
						type="button"
						aria-label="다음 카드로 스크롤"
						onClick={() => scroll("right")}
						className="absolute -right-4 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-md transition hover:bg-gray-50 md:flex"
					>
						<ChevronRight className="h-5 w-5 text-gray-600" aria-hidden />
					</button>

					<div
						ref={scrollRef}
						className="flex snap-x snap-mandatory gap-5 overflow-x-auto pb-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
					>
						{SHARED_PLANS.map((plan) => (
							<article
								key={plan.id}
								className="flex w-[288px] shrink-0 snap-start flex-col overflow-hidden rounded-2xl border border-[#E2E8F0] shadow-sm transition-shadow hover:shadow-md"
							>
								<div className="h-44 shrink-0 bg-neutral-200" aria-hidden />

								<div className="flex grow flex-col p-4">
									<h3 className="text-base font-semibold text-[#020817]">{plan.title}</h3>
									<div className="mt-1.5 flex flex-wrap items-center gap-3 text-sm text-[#64748B]">
										<span>{plan.distance}</span>
										<span className="text-[#CBD5E1]">|</span>
										<span>{plan.days}일</span>
										<span className="text-[#CBD5E1]">|</span>
										<span>↑ {plan.elevation}</span>
									</div>
									<div className="mt-3 grow">
										{plan.description ? (
											<p className="line-clamp-2 text-sm leading-relaxed text-[#64748B]">
												{plan.description}
											</p>
										) : (
											<p className="text-sm italic text-[#CBD5E1]">설명이 없습니다</p>
										)}
									</div>
								</div>
							</article>
						))}
					</div>
				</div>
			</div>
		</section>
	);
}
