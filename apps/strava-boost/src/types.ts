export type StravaActivity = {
	id: number;
	name: string;
	distance: number; // meters
	moving_time: number; // seconds
	elapsed_time: number; // seconds
	type: string;
	start_date: string;
	start_date_local: string;
	gear_id: string | null;
	average_speed: number; // meters per second
	max_speed: number; // meters per second
	total_elevation_gain?: number; // meters
	trainer?: boolean; // 실내 트레이너 사용 여부
	device_name?: string; // 활동 기록에 사용된 디바이스 이름
	workout_type?: number; // 워크아웃 타입
};

export type StravaTokenResponse = {
	access_token: string;
	refresh_token: string;
	expires_at: number;
	expires_in: number;
	athlete: {
		id: number;
		username: string;
		firstname: string;
		lastname: string;
	};
};

export type EBikeStats = {
	totalDistance: number; // kilometers
	totalCount: number;
	byYear: {
		[year: string]: {
			distance: number; // kilometers
			count: number;
		};
	};
};
