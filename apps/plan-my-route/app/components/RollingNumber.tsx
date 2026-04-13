"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { animate, motion, useMotionValue } from "motion/react";
import { cn } from "@my-ridings/ui";

type RollingDigitColumnProps = {
  fromDigit: number;
  toDigit: number;
  spinRounds: number;
  duration: number;
  delay: number;
  lineHeightPx: number;
  digitClassName?: string | undefined;
};

function RollingDigitColumn({
  fromDigit,
  toDigit,
  spinRounds,
  duration,
  delay,
  lineHeightPx,
  digitClassName,
}: RollingDigitColumnProps) {
  const y = useMotionValue(-fromDigit * lineHeightPx);

  useEffect(() => {
    const from = ((fromDigit % 10) + 10) % 10;
    const to = ((toDigit % 10) + 10) % 10;
    y.set(-from * lineHeightPx);

    if (from === to) return;

    const end = to + spinRounds * 10;
    const ctrl = animate(from, end, {
      duration,
      delay,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (latest) => {
        const mod = ((Math.floor(latest) % 10) + 10) % 10;
        y.set(-mod * lineHeightPx);
      },
      onComplete: () => {
        y.set(-to * lineHeightPx);
      },
    });
    return () => ctrl.stop();
  }, [delay, duration, fromDigit, lineHeightPx, spinRounds, toDigit, y]);

  return (
    <div
      className="relative min-w-[0.55em] overflow-hidden tabular-nums"
      style={{ height: lineHeightPx }}
    >
      <motion.div
        className={cn("flex flex-col", digitClassName)}
        style={{ y, willChange: "transform" }}
      >
        {Array.from({ length: 10 }, (_, d) => (
          <div
            key={d}
            className="flex shrink-0 items-center justify-center"
            style={{ height: lineHeightPx }}
          >
            {d}
          </div>
        ))}
      </motion.div>
    </div>
  );
}

function digitColumnCount(absInt: number, minDigitColumns: number): number {
  const len = absInt === 0 ? 1 : String(absInt).length;
  return Math.max(minDigitColumns, len);
}

function paddedDigitArray(absInt: number, columns: number): number[] {
  const v = Math.max(0, Math.floor(absInt));
  const s = v.toString();
  if (s.length > columns) return s.split("").map((ch) => Number(ch));
  return s.padStart(columns, "0").split("").map((ch) => Number(ch));
}

/** 왼쪽부터 숫자 슬롯 + 선택적 천단위 구분자(뒤에서 3자리 앞) */
function buildDisplaySlots(
  absInt: number,
  cols: number,
  groupSeparator: string | undefined,
): Array<{ kind: "digit"; to: number } | { kind: "sep" }> {
  const digits = paddedDigitArray(absInt, cols);
  if (!groupSeparator || digits.length <= 3) {
    return digits.map((to) => ({ kind: "digit" as const, to }));
  }
  const raw = digits.join("");
  const lead = raw.slice(0, -3);
  const tail = raw.slice(-3);
  const out: Array<{ kind: "digit"; to: number } | { kind: "sep" }> = [];
  for (const ch of lead) out.push({ kind: "digit", to: Number(ch) });
  out.push({ kind: "sep" });
  for (const ch of tail) out.push({ kind: "digit", to: Number(ch) });
  return out;
}

export type RollingNumberProps = {
  value: number;
  minDigitColumns?: number;
  className?: string | undefined;
  digitClassName?: string | undefined;
  lineHeightPx?: number;
  spinRoundsPerColumn?: number;
  duration?: number;
  groupSeparator?: string | undefined;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
};

export function RollingNumber({
  value,
  minDigitColumns = 3,
  className,
  digitClassName,
  lineHeightPx = 22,
  spinRoundsPerColumn = 1,
  duration = 1.05,
  groupSeparator,
  prefix,
  suffix,
}: RollingNumberProps) {
  const prevRef = useRef<number | null>(null);
  const prev = prevRef.current;
  const absInt = Math.max(0, Math.floor(Math.abs(value)));
  const prevAbs =
    prev == null ? 0 : Math.max(0, Math.floor(Math.abs(prev)));
  const cols = Math.max(
    digitColumnCount(absInt, minDigitColumns),
    digitColumnCount(prevAbs, minDigitColumns),
  );

  const slots = useMemo(
    () => buildDisplaySlots(absInt, cols, groupSeparator),
    [absInt, cols, groupSeparator],
  );

  const digitCount = slots.filter((s) => s.kind === "digit").length;
  const fromDigits = paddedDigitArray(prevAbs, digitCount);

  useLayoutEffect(() => {
    prevRef.current = value;
  }, [value]);

  let digitIndex = 0;
  return (
    <span
      className={cn("inline-flex items-center justify-center gap-px", className)}
    >
      {prefix != null ? <span className="shrink-0">{prefix}</span> : null}
      {slots.map((slot, i) => {
        if (slot.kind === "sep") {
          return (
            <span
              key={`sep-${i}`}
              className={cn("shrink-0 translate-y-px", digitClassName)}
              aria-hidden
            >
              {groupSeparator}
            </span>
          );
        }
        const fromDigit = fromDigits[digitIndex] ?? 0;
        const stagger = digitIndex * 0.06;
        digitIndex += 1;
        return (
          <RollingDigitColumn
            key={`d-${i}`}
            fromDigit={fromDigit}
            toDigit={slot.to}
            spinRounds={spinRoundsPerColumn}
            duration={duration}
            delay={stagger}
            lineHeightPx={lineHeightPx}
            digitClassName={digitClassName}
          />
        );
      })}
      {suffix != null ? <span className="shrink-0">{suffix}</span> : null}
    </span>
  );
}

export type RollingDeciKProps = {
  /** meters / 100 반올림 정수 (예: 26700m → 267 → +26.7k) */
  deciK: number;
  className?: string | undefined;
  digitClassName?: string | undefined;
  lineHeightPx?: number;
  spinRoundsPerColumn?: number;
  duration?: number;
};

export function RollingDeciK({
  deciK,
  className,
  digitClassName,
  lineHeightPx = 22,
  spinRoundsPerColumn = 1,
  duration = 1.05,
}: RollingDeciKProps) {
  const prevRef = useRef<number | null>(null);
  const prev = prevRef.current;
  const v = Math.max(0, Math.floor(deciK));
  const head = Math.floor(v / 10);
  const tail = v % 10;
  const prevV = prev == null ? 0 : Math.max(0, Math.floor(prev));
  const prevTail = prevV % 10;
  const headLen = Math.max(1, String(head).length);

  useLayoutEffect(() => {
    prevRef.current = v;
  }, [v]);

  return (
    <span
      className={cn("inline-flex items-center justify-center gap-px", className)}
    >
      <span className={cn("shrink-0", digitClassName)}>+</span>
      <RollingNumber
        value={head}
        minDigitColumns={headLen}
        digitClassName={digitClassName}
        lineHeightPx={lineHeightPx}
        spinRoundsPerColumn={spinRoundsPerColumn}
        duration={duration}
      />
      <span className={cn("shrink-0", digitClassName)}>.</span>
      <RollingDigitColumn
        fromDigit={prev == null ? 0 : prevTail}
        toDigit={tail}
        spinRounds={spinRoundsPerColumn}
        duration={duration}
        delay={headLen * 0.06}
        lineHeightPx={lineHeightPx}
        digitClassName={digitClassName}
      />
      <span className={cn("shrink-0", digitClassName)}>k</span>
    </span>
  );
}
