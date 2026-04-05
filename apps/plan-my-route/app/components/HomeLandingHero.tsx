"use client";

import { Button } from "@my-ridings/ui";
import Link from "next/link";
import { useEffect, useRef } from "react";

export const LANDING_START_CTA = "시작하기";

const R = 88;
const G = 66;
const B = 244;

type Particle = {
  x: number;
  y: number;
  speed: number;
  size: number;
  alpha: number;
};

function AnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = 0;
    let h = 0;
    let raf = 0;

    const angle = -Math.PI / 6;
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);

    let particles: Particle[] = [];

    const initParticles = () => {
      particles = Array.from({ length: 80 }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        speed: 0.5 + Math.random() * 1.0,
        size: 0.8 + Math.random() * 2.2,
        alpha: 0.12 + Math.random() * 0.42,
      }));
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      initParticles();
    };

    resize();
    window.addEventListener("resize", resize);

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      particles.forEach((p) => {
        p.x += dx * p.speed;
        p.y += dy * p.speed;
        if (p.x > w + 10 || p.y < -10) {
          p.x = -10 + Math.random() * w * 0.4;
          p.y = h + Math.random() * h * 0.4;
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${R},${G},${B},${p.alpha})`;
        ctx.fill();
      });
      raf = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 h-full w-full"
      style={{ pointerEvents: "none" }}
      aria-hidden
    />
  );
}

const HERO_COPY = {
  kicker: "Plan My Route",
  body: "외국 지도를 사용하는 서비스에는\n편의점, 마트, 숙박 같은 장소 정보가 부족하여\n여러 날 라이딩 계획 짜는게 불편해서 만들었어요",
} as const;

export type HomeLandingHeroProps = {
  signInHref: string;
};

export function HomeLandingHero({ signInHref }: HomeLandingHeroProps) {
  return (
    <section className="relative flex min-h-[85vh] items-center justify-center overflow-hidden bg-linear-to-b from-[#F8FAFC] to-white dark:from-zinc-950 dark:to-zinc-950">
      <AnimatedBackground />
      <div className="relative z-10 mx-auto max-w-3xl px-6 pt-14 pb-20 text-center">
        <p className="mb-6 text-sm tracking-wide text-[#5842F4]">
          {HERO_COPY.kicker}
        </p>
        <h1 className="mb-6 text-3xl leading-snug font-bold break-keep text-[#020817] md:text-4xl lg:text-5xl dark:text-zinc-50">
          <span className="block md:hidden">
            백두대간·국토종주의{" "}
            <span className="whitespace-nowrap">여러 날 라이딩</span>
          </span>
          <span className="hidden md:block">백두대간·국토종주의</span>
          <span className="hidden md:block">여러 날 라이딩</span>
          <span className="block md:whitespace-nowrap">
            카카오맵으로
            <br className="md:hidden" /> 일정 계획 짜보세요
          </span>
        </h1>
        <p className="whitespace-pre-line text-base leading-relaxed text-[#64748B] md:text-lg dark:text-zinc-400">
          {HERO_COPY.body}
        </p>
        <Button
          asChild
          size="lg"
          className="mt-10 h-12 w-fit rounded-full border-0 bg-[#5842F4] px-8 text-sm font-semibold text-white shadow-none hover:bg-[#4a36d6] dark:bg-[#5842F4] dark:text-white dark:hover:bg-[#4a36d6]"
        >
          <Link
            href={signInHref}
            className="inline-flex items-center justify-center"
          >
            {LANDING_START_CTA}
          </Link>
        </Button>
      </div>
    </section>
  );
}
