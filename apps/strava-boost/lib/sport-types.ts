"use client";

// Strava 스포츠 종목 타입을 표시 이름으로 매핑
export const SPORT_TYPE_DISPLAY_NAMES: Record<string, string> = {
	AlpineSki: "알파인 스키",
	BackcountrySki: "백컨트리 스키",
	Canoeing: "카누",
	Crossfit: "크로스핏",
	EBikeRide: "E-Bike Ride",
	Elliptical: "엘립티컬",
	EMountainBikeRide: "E-Mountain Bike Ride",
	Golf: "골프",
	GravelRide: "그래블 라이드",
	Handcycle: "핸드사이클",
	Hike: "하이킹",
	IceSkate: "아이스 스케이트",
	InlineSkate: "인라인 스케이트",
	Kayaking: "카약",
	Kitesurf: "카이트서핑",
	MountainBikeRide: "마운틴 바이크",
	NordicSki: "노르딕 스키",
	Ride: "라이드",
	RockClimbing: "암벽 등반",
	RollerSki: "롤러 스키",
	Rowing: "로잉",
	Run: "러닝",
	Sail: "요트",
	Skateboard: "스케이트보드",
	Snowboard: "스노보드",
	Snowshoe: "스노슈",
	Soccer: "축구",
	StairStepper: "계단 오르기",
	StandUpPaddling: "서핑",
	Surfing: "서핑",
	Swim: "수영",
	Velomobile: "벨로모빌",
	VirtualRide: "가상 라이드",
	VirtualRun: "가상 러닝",
	Walk: "걷기",
	WeightTraining: "웨이트 트레이닝",
	Wheelchair: "휠체어",
	Windsurf: "윈드서핑",
	Workout: "운동",
	Yoga: "요가",
};

export const getSportTypeDisplayName = (sportType: string): string => {
	return SPORT_TYPE_DISPLAY_NAMES[sportType] || sportType;
};
