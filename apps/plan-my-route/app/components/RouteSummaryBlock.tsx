"use client";

import {
	formatRouteDistanceFromMeters,
	formatRouteInteger,
} from "../lib/routeSummaryFormat";

const DEFAULT_LOCALE = "ko-KR";

type RouteSummaryBlockProps = {
	name: string;
	rwgpsUrl: string;
	distanceMeters: number;
	elevationGain: number;
	elevationLoss: number;
	className?: string;
};

export function RouteSummaryBlock({
	name,
	rwgpsUrl,
	distanceMeters,
	elevationGain,
	elevationLoss,
	className = "",
}: RouteSummaryBlockProps) {
	const locale =
		typeof navigator !== "undefined" ? navigator.language : DEFAULT_LOCALE;

	return (
		<div
			className={`mb-3 space-y-1 border-b border-zinc-200 pb-3 dark:border-zinc-700 ${className}`.trim()}
		>
			<h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
				{name}
			</h2>
			{rwgpsUrl ? (
				<a
					href={rwgpsUrl}
					target="_blank"
					rel="noopener noreferrer"
					className="block text-xs text-orange-500 hover:underline"
				>
					RideWithGPS에서 보기 ↗
				</a>
			) : null}
			<div className="flex flex-nowrap justify-between text-xs">
				<span className="shrink-0 text-zinc-500 dark:text-zinc-400">
					거리 {formatRouteDistanceFromMeters(distanceMeters, locale)}
				</span>
				<span className="flex shrink-0 gap-2">
					<span className="text-green-600 dark:text-green-400">
						+{formatRouteInteger(elevationGain, locale)} m
					</span>
					<span className="text-zinc-500 dark:text-zinc-400">
						-{formatRouteInteger(elevationLoss, locale)} m
					</span>
				</span>
			</div>
		</div>
	);
}
