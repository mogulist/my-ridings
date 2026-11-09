"use client";

import * as Popover from "@radix-ui/react-popover";
import { ArrowRight, CalendarRange, ChevronDown, X } from "lucide-react";
import dynamic from "next/dynamic";
import { useState } from "react";
import type { DateRange } from "react-day-picker";
import { ko } from "react-day-picker/locale/ko";
import calendarStyles from "react-day-picker/style.module.css";
import { localDateTime } from "../_lib/local-date-time";
import type { RideDateRange } from "../_lib/ride-date-range";
import "./ride-date-range.css";

// The calendar code is loaded only when the popover is opened.
const DayPicker = dynamic(() => import("react-day-picker").then((module) => module.DayPicker), {
	loading: () => <p className="boost-calendar-loading">달력을 불러오고 있습니다.</p>,
});

function calendarRange(value: RideDateRange | null): DateRange | undefined {
	return value
		? { from: new Date(`${value.from}T00:00:00`), to: new Date(`${value.to}T00:00:00`) }
		: undefined;
}

type RideDateRangeFilterProps = {
	value: RideDateRange | null;
	onChange: (value: RideDateRange | null) => void;
	earliestDate?: string;
	latestDate?: string;
	disabled: boolean;
};

export function RideDateRangeFilter({
	value,
	onChange,
	earliestDate,
	latestDate,
	disabled,
}: RideDateRangeFilterProps) {
	const [open, setOpen] = useState(false);
	const [draft, setDraft] = useState<DateRange | undefined>();
	const today = new Date();
	const dateLabel = (date: Date | undefined) =>
		date ? localDateTime(date).slice(0, 10).replaceAll("-", ".") : "선택하세요";
	return (
		<div className="boost-ride-date-filter">
			<Popover.Root
				open={open}
				onOpenChange={(next) => {
					setDraft(calendarRange(value));
					setOpen(next);
				}}
			>
				<Popover.Trigger asChild>
					<button
						type="button"
						className="boost-date-trigger"
						disabled={disabled}
						aria-label={
							value ? `라이딩 기간 ${value.from}부터 ${value.to}까지` : "라이딩 기간 선택"
						}
					>
						<CalendarRange size={17} />
						<span>
							{value
								? `${value.from.replaceAll("-", ".")} ~ ${value.to.replaceAll("-", ".")}`
								: "기간 선택"}
						</span>
						<ChevronDown size={15} />
					</button>
				</Popover.Trigger>
				<Popover.Portal>
					<Popover.Content
						className="boost-date-popover"
						align="start"
						sideOffset={8}
						collisionPadding={12}
						aria-label="라이딩 기간 선택"
					>
						<div className="boost-date-selection">
							<div>
								<span>시작일</span>
								<strong>{dateLabel(draft?.from)}</strong>
							</div>
							<ArrowRight size={17} />
							<div>
								<span>종료일</span>
								<strong>{dateLabel(draft?.to)}</strong>
							</div>
						</div>
						<DayPicker
							mode="range"
							resetOnSelect
							selected={draft}
							onSelect={(next) => {
								setDraft(next);
								if (next?.from && next.to) {
									onChange({
										from: localDateTime(next.from).slice(0, 10),
										to: localDateTime(next.to).slice(0, 10),
									});
									setOpen(false);
								}
							}}
							locale={ko}
							className="boost-ride-calendar"
							classNames={calendarStyles}
							captionLayout="dropdown"
							navLayout="after"
							startMonth={earliestDate ? new Date(`${earliestDate}T00:00:00`) : new Date(2000, 0)}
							endMonth={today}
							defaultMonth={
								draft?.from ?? (latestDate ? new Date(`${latestDate}T00:00:00`) : today)
							}
							showOutsideDays
							fixedWeeks
							autoFocus
						/>
						<div className="boost-date-popover-footer">
							<span aria-live="polite">
								{draft?.from && !draft.to
									? "종료일을 선택하세요"
									: "시작일과 종료일을 차례로 선택하세요"}
							</span>
							<button
								type="button"
								onClick={() => {
									onChange(null);
									setDraft(undefined);
									setOpen(false);
								}}
							>
								전체 기간
							</button>
						</div>
					</Popover.Content>
				</Popover.Portal>
			</Popover.Root>
			{value && (
				<button
					type="button"
					className="boost-date-clear"
					disabled={disabled}
					aria-label="기간 필터 초기화"
					onClick={() => onChange(null)}
				>
					<X size={16} />
				</button>
			)}
		</div>
	);
}
