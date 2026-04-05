"use client";

import {
  CalendarDays,
  MapPin,
  Search,
  Smartphone,
  StickyNote,
  Upload,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";

type HowToUseStep = {
  num: number;
  icon: LucideIcon;
  title: string;
  desc: string;
  iconBg: string;
  iconColor: string;
  accentHex: string;
  border: string;
};

const HOW_TO_USE_STEPS: HowToUseStep[] = [
  {
    num: 1,
    icon: Upload,
    title: "경로를 가져오세요",
    desc: "GPX나 RideWithGPS의 경로를 가져올 수 있어요.\n경로를 수정하거나 직접 만드는 기능은 개발 예정이에요.",
    iconBg: "bg-violet-100",
    iconColor: "text-violet-600",
    accentHex: "#5842F4",
    border: "border-violet-200",
  },
  {
    num: 2,
    icon: CalendarDays,
    title: "다양한 라이딩 계획을 세워보세요",
    desc: "경로는 같아도 3일 동안 라이딩할지, 5일 동안 라이딩할지, 여러 계획을 만들어보며 마음에 드는 라이딩 계획을 선택하세요.",
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
    accentHex: "#3B82F6",
    border: "border-blue-200",
  },
  {
    num: 3,
    icon: Search,
    title: "카카오 장소 검색을 활용하세요",
    desc: "어느 지역의 어디서 숙박할지, 어떤 편의점이나 마트에서 보급할지, 어떤 맛집에서 식사할지, 어떤 카페에서 아아를 마실지 — 선호 장소를 지정해두세요.",
    iconBg: "bg-amber-100",
    iconColor: "text-amber-600",
    accentHex: "#F59E0B",
    border: "border-amber-200",
  },
  {
    num: 4,
    icon: MapPin,
    title: "나만의 POI를 저장하세요",
    desc: "선호하는 장소들 중에 중요한 곳은 POI(Point Of Interest)로 등록하세요. 체크포인트, 고개의 정상 등 중요한 지점은 POI로 등록하고 라이딩할 때 참고하세요.",
    iconBg: "bg-emerald-100",
    iconColor: "text-emerald-600",
    accentHex: "#059669",
    border: "border-emerald-200",
  },
  {
    num: 5,
    icon: StickyNote,
    title: "메모하세요",
    desc: "일별 라이딩하며 유의할 점, POI에 대해 알아본 것, 라이딩할 때 참고할 것들을 메모하세요. 메모는 여러 계획 중 하나를 선택할 때도 유용해요.",
    iconBg: "bg-rose-100",
    iconColor: "text-rose-600",
    accentHex: "#F43F5E",
    border: "border-rose-200",
  },
  {
    num: 6,
    icon: Smartphone,
    title: "라이딩할 때에는 앱을 활용하세요",
    desc: "내가 짠 라이딩 계획, 스마트폰의 앱을 참고하며 라이딩하세요. 그런데 아직 개발 중이에요 :)",
    iconBg: "bg-slate-100",
    iconColor: "text-slate-500",
    accentHex: "#64748B",
    border: "border-slate-200",
  },
];

type ScreenshotPlaceholderProps = {
  step: HowToUseStep;
  src?: string;
  alt?: string;
};

function ScreenshotPlaceholder({ step, src, alt }: ScreenshotPlaceholderProps) {
  const Icon = step.icon;
  const imageAlt = alt ?? step.title;

  if (src) {
    return (
      <div
        className={`relative w-full aspect-video overflow-hidden rounded-2xl border bg-white shadow-sm ${step.border}`}
      >
        <Image
          src={src}
          alt={imageAlt}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 640px"
        />
      </div>
    );
  }

  return (
    <div
      className={`flex aspect-video w-full flex-col items-center justify-center gap-3 rounded-2xl border bg-white shadow-sm ${step.border}`}
    >
      <div
        className={`flex h-14 w-14 items-center justify-center rounded-2xl ${step.iconBg} ${step.iconColor}`}
      >
        <Icon className="h-7 w-7" aria-hidden />
      </div>
      <span className="text-xs tracking-wide text-slate-500">
        스크린샷 준비 중
      </span>
    </div>
  );
}

export function HomeLandingHowToUse() {
  return (
    <section className="bg-zinc-50 dark:bg-zinc-950 px-6 py-20">
      <div className="mx-auto max-w-5xl">
        <p className="mb-2 text-center text-sm tracking-wide text-indigo-600">
          HOW TO USE
        </p>
        <h2 className="mb-4 text-center text-2xl font-bold text-slate-900 md:text-3xl">
          사용 방법
        </h2>
        <p className="mb-20 text-center text-sm text-slate-500">
          스크롤하며 단계별로 살펴보세요
        </p>

        <div className="flex flex-col gap-20 md:gap-28">
          {HOW_TO_USE_STEPS.map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.num}
                className="grid items-center gap-8 md:grid-cols-2 md:gap-16"
              >
                <div>
                  <div className="mb-5 flex items-center gap-3">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${step.iconBg} ${step.iconColor}`}
                    >
                      <Icon className="h-5 w-5" aria-hidden />
                    </div>
                    <span
                      className="text-xs tracking-widest text-indigo-600 dark:text-indigo-400 font-semibold"
                      style={{ color: step.accentHex }}
                    >
                      STEP {step.num}
                    </span>
                  </div>

                  <h3 className="mb-3 text-xl text-slate-900 dark:text-zinc-50">
                    {step.title}
                  </h3>
                  <p className="whitespace-pre-line text-sm leading-relaxed text-slate-500 dark:text-zinc-400">
                    {step.desc}
                  </p>
                </div>

                <div>
                  <ScreenshotPlaceholder step={step} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
