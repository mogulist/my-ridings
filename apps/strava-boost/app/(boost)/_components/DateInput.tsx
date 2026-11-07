"use client";

import { localDateTime } from "../_lib/local-date-time";

/** Separate date controls keep year/month/day order independent of browser locale. */
export function DateInput({
	value,
	onChange,
	min,
	max,
	required = false,
	withTime = false,
	disabled = false,
}: {
	value: string;
	onChange: (value: string) => void;
	min?: string;
	max?: string;
	required?: boolean;
	withTime?: boolean;
	disabled?: boolean;
}) {
	const fallback = localDateTime(new Date());
	const [year, month, day] = (value || fallback).slice(0, 10).split("-").map(Number);
	const time = value.slice(11, 16) || "00:00";
	const pad = (n: number) => String(n).padStart(2, "0");
	const firstYear = Math.min(Number(min?.slice(0, 4) || 1900), year);
	const lastYear = Math.max(Number(max?.slice(0, 4) || new Date().getFullYear()), year);
	function change(y: number, m: number, d: number, t = time) {
		const clampedDay = Math.min(d, new Date(y, m, 0).getDate());
		let next = `${y}-${pad(m)}-${pad(clampedDay)}${withTime ? `T${t}` : ""}`;
		if (min && next < min) next = min;
		if (max && next > max) next = max;
		onChange(next);
	}
	return (
		<span className="boost-date-input">
			<select
				disabled={disabled}
				aria-label="연도"
				required={required}
				value={value ? year : ""}
				onChange={(e) => change(Number(e.target.value), month, day)}
			>
				<option value="" disabled>
					년
				</option>
				{Array.from({ length: lastYear - firstYear + 1 }, (_, i) => firstYear + i)
					.reverse()
					.map((y) => (
						<option key={y} value={y}>
							{y}년
						</option>
					))}
			</select>
			<select
				disabled={disabled}
				aria-label="월"
				required={required}
				value={value ? month : ""}
				onChange={(e) => change(year, Number(e.target.value), day)}
			>
				<option value="" disabled>
					월
				</option>
				{Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
					<option key={m} value={m}>
						{pad(m)}월
					</option>
				))}
			</select>
			<select
				disabled={disabled}
				aria-label="일"
				required={required}
				value={value ? day : ""}
				onChange={(e) => change(year, month, Number(e.target.value))}
			>
				<option value="" disabled>
					일
				</option>
				{Array.from({ length: new Date(year, month, 0).getDate() }, (_, i) => i + 1).map((d) => (
					<option key={d} value={d}>
						{pad(d)}일
					</option>
				))}
			</select>
			{withTime && (
				<input
					disabled={disabled}
					aria-label="시간"
					type="time"
					required={required}
					value={value ? time : ""}
					onChange={(e) => {
						if (e.target.value) change(year, month, day, e.target.value);
					}}
				/>
			)}
			{!required && value && (
				<button
					type="button"
					disabled={disabled}
					className="boost-secondary"
					onClick={() => onChange("")}
				>
					지우기
				</button>
			)}
		</span>
	);
}
