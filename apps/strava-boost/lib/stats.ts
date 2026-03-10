"use client";

import type { StravaActivity } from "@/src/types";

export type ActivityStats = {
	totalDistance: number; // kilometers
	totalTime: number; // hours
	totalElevation: number; // meters (if available)
	totalCount: number;
	byYear: {
		[year: string]: {
			distance: number; // kilometers
			time: number; // hours
			elevation: number; // meters
			count: number;
		};
	};
};

const metersToKilometers = (meters: number): number => {
	return Math.round((meters / 1000) * 100) / 100;
};

const secondsToHours = (seconds: number): number => {
	return Math.round((seconds / 3600) * 100) / 100;
};

const getYearFromDate = (dateString: string): string => {
	return new Date(dateString).getFullYear().toString();
};

export const calculateStats = (activities: StravaActivity[]): ActivityStats => {
	let totalDistance = 0;
	let totalTime = 0;
	let totalElevation = 0;
	const byYear: {
		[year: string]: {
			distance: number;
			time: number;
			elevation: number;
			count: number;
		};
	} = {};

	activities.forEach((activity) => {
		const distanceKm = metersToKilometers(activity.distance);
		const timeHours = secondsToHours(activity.moving_time);
		const elevation = activity.total_elevation_gain || 0;

		totalDistance += distanceKm;
		totalTime += timeHours;
		totalElevation += elevation;

		const year = getYearFromDate(activity.start_date_local);

		if (!byYear[year]) {
			byYear[year] = { distance: 0, time: 0, elevation: 0, count: 0 };
		}

		byYear[year].distance += distanceKm;
		byYear[year].time += timeHours;
		byYear[year].elevation += elevation;
		byYear[year].count += 1;
	});

	// 소수점 둘째 자리까지 반올림
	totalDistance = Math.round(totalDistance * 100) / 100;
	totalTime = Math.round(totalTime * 100) / 100;
	totalElevation = Math.round(totalElevation * 100) / 100;

	Object.keys(byYear).forEach((year) => {
		byYear[year].distance = Math.round(byYear[year].distance * 100) / 100;
		byYear[year].time = Math.round(byYear[year].time * 100) / 100;
		byYear[year].elevation = Math.round(byYear[year].elevation * 100) / 100;
	});

	return {
		totalDistance,
		totalTime,
		totalElevation,
		totalCount: activities.length,
		byYear,
	};
};
