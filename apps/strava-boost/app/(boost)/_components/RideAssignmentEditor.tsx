"use client";

import Link from "next/link";
import { useState } from "react";
import { assignmentFor, bikeChoices, type Garage, preferredBikeId } from "@/lib/equipment";
import type { StravaActivity } from "@/types/strava";
import { Workbench } from "./Workbench";

export function RideAssignmentEditor({
	activity,
	activities,
	garage,
	save,
	busy,
	editPart,
	close,
	onDirty,
	demo,
}: {
	activity: StravaActivity;
	activities: StravaActivity[];
	garage: Garage;
	save: (garage: Garage) => Promise<boolean>;
	busy: boolean;
	editPart: (id: string) => void;
	close: () => void;
	onDirty: (dirty: boolean) => void;
	demo: boolean;
}) {
	const [bikeId, setBikeId] = useState(
		() => assignmentFor(garage, activity)?.bikeId ?? preferredBikeId(garage, activities),
	);
	const [dirty, setDirty] = useState(false);
	const choices = bikeChoices(garage, activities);
	return (
		<section className="boost-ride-editor" aria-label="라이딩 조합 수정">
			<button type="button" className="boost-text" onClick={close}>
				← 라이딩 목록으로
			</button>
			<div className="boost-page-title">
				<div>
					<p className="boost-eyebrow">라이딩 기록 수정</p>
					<h1>{activity.name}</h1>
				</div>
			</div>
			<p className="boost-muted">
				{new Date(activity.start_date).toLocaleDateString("ko-KR")} ·{" "}
				{(activity.distance / 1000).toFixed(1)}km
			</p>
			<label className="boost-field boost-search">
				이 라이딩에 사용한 자전거
				<select
					value={bikeId}
					disabled={busy}
					onChange={(e) => {
						if (dirty && !window.confirm("저장하지 않은 라이딩 변경을 버리고 자전거를 바꿀까요?"))
							return;
						setBikeId(e.target.value);
					}}
				>
					{!bikeId && (
						<option value="" disabled>
							자전거 선택
						</option>
					)}
					{[...choices.current, ...choices.retired].map((bike) => (
						<option key={bike.id} value={bike.id}>
							{bike.name}
							{bike.usedUntil ? " · 사용 종료" : ""}
						</option>
					))}
				</select>
			</label>
			<p className="boost-ride-scope">
				이 라이딩의 자전거와 부품만 수정합니다. 현재 장착 상태와 저장된 조합은 유지됩니다.
			</p>
			{bikeId && (
				<Workbench
					garage={garage}
					activities={activities}
					activity={activity}
					bikeId={bikeId}
					save={save}
					busy={busy}
					editPart={editPart}
					onDirty={(value) => {
						setDirty(value);
						onDirty(value);
					}}
				/>
			)}
			{!demo && (
				<Link href={`/activity/${activity.id}`} className="boost-text">
					경로·고도 프로필 보기
				</Link>
			)}
		</section>
	);
}
