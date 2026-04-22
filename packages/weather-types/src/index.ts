/**
 * @my-ridings/weather-types — weather HTTP API용 zod 스키마·추론 타입.
 */
export type {
	AlongForecastBody,
	AlongForecastResponse,
	AlongSegment,
} from "./forecast-along";
export {
	alongForecastBodySchema,
	alongForecastResponseSchema,
	alongSegmentSchema,
} from "./forecast-along";

export type {
	DailyForecastQuery,
	DailyForecastResponse,
	DailyRow,
} from "./forecast-daily";
export {
	dailyForecastQuerySchema,
	dailyForecastResponseSchema,
	dailyRowSchema,
} from "./forecast-daily";

export type {
	HourlyForecast,
	PointForecastQuery,
	PointForecastResponse,
} from "./forecast-point";
export {
	hourlyForecastSchema,
	pointForecastQuerySchema,
	pointForecastResponseSchema,
} from "./forecast-point";

export type {
	ScrollAnchorLocalHour,
	StageBriefingBody,
	StageBriefingMidResponse,
	StageBriefingResponse,
	StageBriefingShortResponse,
	StageMidPoint,
	StageShortPoint,
} from "./forecast-stage-briefing";
export {
	scrollAnchorLocalHourSchema,
	stageBriefingBodySchema,
	stageBriefingMidResponseSchema,
	stageBriefingResponseSchema,
	stageBriefingShortResponseSchema,
	stageMidPointSchema,
	stageShortPointSchema,
} from "./forecast-stage-briefing";
