import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Linking from "expo-linking";
import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import { AppState } from "react-native";

import type { PlanDetail } from "@/features/api/plan-my-route";
import type { ActiveRide } from "@/features/navigation/active-ride";

import RideLiveActivity from "./ride-live-activity.ios";
import {
  buildRideSupplySnapshot,
  locateRide,
  prepareRideSupplyPlan,
  type RideFix,
  type RidePosition,
  type RideSupplyPlan,
} from "./ride-supply-data";
import { setRideTrackingStatus } from "./ride-tracking-state";

const TASK_NAME = "ride-supply-location-v1";
const STORAGE_KEY = "plan-my-route:live-ride:v1";
const PLAN_KEY = "plan-my-route:live-ride-plan:v1";
const RENEW_AFTER_MS = 7 * 60 * 60 * 1000;
type Session = {
  ride: ActiveRide;
  plan: RideSupplyPlan | null;
  position: RidePosition | null;
  lastFixTimestamp: number;
  activityStartedAt: number | null;
  paused: boolean;
  positionMessage: string | null;
};
let session: Session | null | undefined;
let foregroundSubscription: Location.LocationSubscription | null = null;
let lastPlanDetail: PlanDetail | undefined;
let queue: Promise<unknown> = Promise.resolve();

// Serialise start/stop, plan edits and batched GPS updates so a late callback cannot revive a stopped ride.
function enqueue(operation: () => Promise<void>): Promise<void> {
  const next = queue.then(operation);
  queue = next.catch((error: unknown) => {
    setRideTrackingStatus({
      error: error instanceof Error ? error.message : "실시간 현황을 갱신하지 못했습니다.",
    });
  });
  return next;
}

async function readSession() {
  if (session !== undefined) return session;
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  try {
    const parsed = raw ? (JSON.parse(raw) as Session) : null;
    session = parsed?.ride?.planId && typeof parsed.paused === "boolean" ? parsed : null;
    if (session) {
      const plan = await AsyncStorage.getItem(PLAN_KEY);
      const cached = plan ? JSON.parse(plan) : null;
      session.plan = cached?.planId === session.ride.planId ? cached.plan : null;
    }
  } catch {
    session = null;
  }
  return session;
}

async function saveSession() {
  if (session) {
    const { plan: _plan, ...state } = session;
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } else await AsyncStorage.multiRemove([STORAGE_KEY, PLAN_KEY]);
}

async function endActivities() {
  for (const activity of RideLiveActivity.getInstances()) await activity.end("immediate");
}

async function renderActivity(message: string | null = null, allowStart = false) {
  if (!session || session.paused) return;
  const props = buildRideSupplySnapshot(
    session.plan,
    session.position,
    message ?? session.positionMessage,
  );
  let activities = RideLiveActivity.getInstances();
  const foreground = AppState.currentState === "active";
  if (
    allowStart &&
    foreground &&
    session.activityStartedAt != null &&
    Date.now() - session.activityStartedAt >= RENEW_AFTER_MS
  ) {
    await endActivities();
    activities = [];
  }
  if (activities.length === 0) {
    if (!allowStart || !foreground) {
      setRideTrackingStatus({
        active: false,
        message: "앱을 열어 실시간 현황을 다시 시작해 주세요.",
      });
      return;
    }
    RideLiveActivity.start(
      props,
      Linking.createURL(`/routes/${session.ride.routeId}/plans/${session.ride.planId}/schedule`),
    );
    session.activityStartedAt = Date.now();
    await saveSession();
  } else {
    await activities[0].update(props);
    for (const extra of activities.slice(1)) await extra.end("immediate");
  }
  setRideTrackingStatus({
    active: true,
    message: message ?? session.positionMessage ?? "잠금화면 보급정보 표시 중",
  });
}

async function stopLocation() {
  foregroundSubscription?.remove();
  foregroundSubscription = null;
  if (await Location.hasStartedLocationUpdatesAsync(TASK_NAME)) {
    await Location.stopLocationUpdatesAsync(TASK_NAME);
  }
  setRideTrackingStatus({ background: false });
}

async function acceptFix(fix: RideFix) {
  await readSession();
  if (!session || session.paused || !session.plan || fix.timestamp <= session.lastFixTimestamp)
    return;
  if (!Number.isFinite(fix.timestamp) || fix.timestamp > Date.now() + 10_000) return;
  session.lastFixTimestamp = fix.timestamp;
  const result = locateRide(session.plan.track, fix, session.position);
  if (result.position) session.position = result.position;
  session.positionMessage = result.reason;
  await saveSession();
  setRideTrackingStatus({
    currentKm: result.position?.km ?? null,
    updatedAt: result.position?.timestamp ?? null,
  });
  await renderActivity(result.reason);
}

function asFix(location: Location.LocationObject): RideFix {
  return { ...location.coords, timestamp: location.timestamp };
}

TaskManager.defineTask<{ locations: Location.LocationObject[] }>(
  TASK_NAME,
  async ({ data, error }) => {
    if (error) {
      setRideTrackingStatus({ error: error.message });
      await enqueue(async () => {
        await readSession();
        await renderActivity("위치 갱신 중단 · 앱 확인");
      });
      return;
    }
    const location = data?.locations.reduce<Location.LocationObject | undefined>(
      (latest, item) => (!latest || item.timestamp > latest.timestamp ? item : latest),
      undefined,
    );
    if (location) await updateRideLocation(asFix(location));
  },
);

async function ensureLocation(requestPermissions: boolean) {
  let foreground = await Location.getForegroundPermissionsAsync();
  if (foreground.status !== "granted" && requestPermissions && foreground.canAskAgain) {
    foreground = await Location.requestForegroundPermissionsAsync();
  }
  if (foreground.status !== "granted") {
    await stopLocation();
    await renderActivity("위치 권한이 필요합니다");
    setRideTrackingStatus({ error: "위치 권한이 필요합니다. iPhone 설정에서 허용해 주세요." });
    return;
  }
  let background = await Location.getBackgroundPermissionsAsync();
  if (background.status !== "granted" && requestPermissions && background.canAskAgain) {
    background = await Location.requestBackgroundPermissionsAsync();
  }
  if (background.status === "granted") {
    if (!(await Location.hasStartedLocationUpdatesAsync(TASK_NAME))) {
      await Location.startLocationUpdatesAsync(TASK_NAME, {
        accuracy: Location.Accuracy.High,
        activityType: Location.ActivityType.Fitness,
        distanceInterval: 50,
        pausesUpdatesAutomatically: false,
        showsBackgroundLocationIndicator: true,
      });
    }
    foregroundSubscription?.remove();
    foregroundSubscription = null;
    setRideTrackingStatus({ background: true, error: null });
  } else {
    if (await Location.hasStartedLocationUpdatesAsync(TASK_NAME))
      await Location.stopLocationUpdatesAsync(TASK_NAME);
    if (!foregroundSubscription) {
      foregroundSubscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, distanceInterval: 50 },
        (location) => {
          void updateRideLocation(asFix(location)).catch(() => {});
        },
      );
    }
    setRideTrackingStatus({
      background: false,
      error: "잠금 중 자동 갱신에는 위치 권한 ‘항상’이 필요합니다.",
    });
  }
  // Do not block the lifecycle queue on a GPS fix indoors. Late results are checked against the ride identity.
  const rideKey = session?.ride.startedAt;
  void Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High })
    .then((location) => {
      if (session?.ride.startedAt === rideKey) return updateRideLocation(asFix(location));
    })
    .catch((error: unknown) => {
      if (session?.ride.startedAt === rideKey)
        setRideTrackingStatus({
          error: error instanceof Error ? error.message : "GPS 위치를 가져오지 못했습니다.",
        });
    });
}

export function syncRideTracking(ride: ActiveRide | null, detail?: PlanDetail): Promise<void> {
  return enqueue(async () => {
    await readSession();
    if (!ride) {
      if (!session) {
        await stopLocation(); // Clean up an orphan GPS task, but leave a laboratory PoC alone.
        return;
      }
      session.paused = true;
      await saveSession();
      await stopLocation();
      await endActivities();
      session = null;
      lastPlanDetail = undefined;
      await saveSession();
      setRideTrackingStatus({
        planId: null,
        active: false,
        paused: false,
        currentKm: null,
        updatedAt: null,
        error: null,
        message: "라이딩 종료",
      });
      return;
    }
    const isNew =
      !session || session.ride.planId !== ride.planId || session.ride.startedAt !== ride.startedAt;
    if (isNew) {
      await stopLocation();
      await endActivities();
      session = {
        ride,
        plan: null,
        position: null,
        lastFixTimestamp: 0,
        activityStartedAt: null,
        paused: false,
        positionMessage: null,
      };
      setRideTrackingStatus({ active: false, currentKm: null, updatedAt: null });
      await AsyncStorage.removeItem(PLAN_KEY);
      lastPlanDetail = undefined;
    }
    if (!session) return;
    if (detail && detail.plan.id === ride.planId && detail !== lastPlanDetail) {
      session.plan = prepareRideSupplyPlan(detail);
      await AsyncStorage.setItem(
        PLAN_KEY,
        JSON.stringify({ planId: ride.planId, plan: session.plan }),
      );
      lastPlanDetail = detail;
    }
    await saveSession();
    setRideTrackingStatus({ planId: ride.planId, paused: session.paused, error: null });
    if (session.paused) {
      await stopLocation();
      setRideTrackingStatus({ active: false, message: "실시간 현황 일시 정지" });
      return;
    }
    const stale = !session.position || Date.now() - session.position.timestamp > 120_000;
    await renderActivity(stale ? "GPS 위치 확인 중" : null, true);
    await ensureLocation(isNew);
  });
}

export function updateRideLocation(fix: RideFix): Promise<void> {
  return enqueue(() => acceptFix(fix));
}

export function refreshRideTracking(): Promise<void> {
  return enqueue(async () => {
    await readSession();
    if (!session || session.paused || AppState.currentState !== "active") return;
    await renderActivity(
      !session.position || Date.now() - session.position.timestamp > 120_000
        ? "GPS 위치 확인 중"
        : null,
      true,
    );
    await ensureLocation(false);
  });
}

export function pauseRideTracking(): Promise<void> {
  return enqueue(async () => {
    await readSession();
    if (!session) return;
    session.paused = true;
    session.activityStartedAt = null;
    await saveSession();
    await stopLocation();
    await endActivities();
    setRideTrackingStatus({
      paused: true,
      active: false,
      error: null,
      message: "실시간 현황 일시 정지",
    });
  });
}

export function resumeRideTracking(): Promise<void> {
  return enqueue(async () => {
    await readSession();
    if (!session) return;
    session.paused = false;
    session.activityStartedAt = null;
    await endActivities();
    await saveSession();
    setRideTrackingStatus({ paused: false, error: null });
    await renderActivity("GPS 위치 확인 중", true);
    await ensureLocation(true);
  });
}
