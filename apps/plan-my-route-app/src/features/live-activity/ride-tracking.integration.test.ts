import { afterAll, beforeEach, describe, expect, mock, spyOn, test } from "bun:test";

import type { PlanDetail } from "@/features/api/plan-my-route";
import type { ActiveRide } from "@/features/navigation/active-ride";

// Native boundaries only are substituted. Run this file in its own Bun process.
const storage = new Map<string, string>();
const appState = { currentState: "active" };
const activities: { update: ReturnType<typeof mock>; end: ReturnType<typeof mock> }[] = [];
let backgroundAllowed = true;
let locationRunning = false;
let starts = 0;
const native = {
  getInstances: () => [...activities],
  start: mock(() => {
    starts++;
    const instance = {
      update: mock(async () => {}),
      end: mock(async () => {
        const index = activities.indexOf(instance);
        if (index >= 0) activities.splice(index, 1);
      }),
    };
    activities.push(instance);
    return instance;
  }),
};
mock.module("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: async (key: string) => storage.get(key) ?? null,
    setItem: async (key: string, value: string) => {
      storage.set(key, value);
    },
    removeItem: async (key: string) => {
      storage.delete(key);
    },
    multiRemove: async (keys: string[]) => {
      keys.forEach((key) => storage.delete(key));
    },
  },
}));
mock.module("react-native", () => ({ AppState: appState }));
mock.module("expo-linking", () => ({ createURL: (path: string) => `test://${path}` }));
mock.module("expo-task-manager", () => ({ defineTask: mock(() => {}) }));
mock.module("expo-location", () => ({
  Accuracy: { High: 4 },
  ActivityType: { Fitness: 3 },
  getForegroundPermissionsAsync: async () => ({ status: "granted" }),
  getBackgroundPermissionsAsync: async () => ({
    status: backgroundAllowed ? "granted" : "denied",
    canAskAgain: false,
  }),
  hasStartedLocationUpdatesAsync: async () => locationRunning,
  startLocationUpdatesAsync: async () => {
    locationRunning = true;
  },
  stopLocationUpdatesAsync: async () => {
    locationRunning = false;
  },
  watchPositionAsync: async () => ({ remove: () => {} }),
  getCurrentPositionAsync: () => new Promise(() => {}),
}));
mock.module("./ride-live-activity.ios", () => ({ default: native }));

const service = await import("./ride-tracking.ios");
const { getRideTrackingStatus } = await import("./ride-tracking-state");
const ride: ActiveRide = {
  routeId: "route",
  planId: "plan",
  routeName: "경로",
  planName: "플랜",
  startedAt: "2026-09-23T00:00:00Z",
  resumePath: "/routes/route/plans/plan/schedule",
};
const plan = {
  plan: { id: "plan" },
  knownRouteElevationGainM: 100,
  trackPoints: Array.from({ length: 101 }, (_, index) => ({
    x: 127 + index / 1000,
    y: 37,
    d: index * 100,
    e: index,
  })),
  stages: [{ id: "stage", start_distance: 0, end_distance: 10000 }],
  planPois: [
    {
      id: "supply",
      name: "실제 보급",
      lat: 37,
      lng: 127.03,
      poi_type: "convenience",
      intent: "planned",
      assignment_mode: "distance",
    },
  ],
} as PlanDetail;

beforeEach(async () => {
  appState.currentState = "active";
  await service.syncRideTracking(null);
  starts = 0;
  backgroundAllowed = true;
});
afterAll(() => mock.restore());

describe("실시간 현황 수명주기", () => {
  test("라이딩 시작·잠금 중 GPS 갱신·종료가 실제 네이티브 경계까지 이어진다", async () => {
    await service.syncRideTracking(ride, plan);
    expect(starts).toBe(1);
    expect(locationRunning).toBe(true);
    appState.currentState = "background";
    await service.updateRideLocation({
      latitude: 37,
      longitude: 127.01,
      accuracy: 10,
      timestamp: Date.now(),
    });
    expect(activities[0].update.mock.calls.at(-1)?.[0].primaryName).toBe("실제 보급");
    expect(activities[0].update.mock.calls.at(-1)?.[0].primaryDistance).toBe("2.0 km");
    await service.syncRideTracking(null);
    expect(locationRunning).toBe(false);
    expect(activities).toHaveLength(0);
    expect(storage.size).toBe(0);
    await service.updateRideLocation({
      latitude: 37,
      longitude: 127.02,
      accuracy: 10,
      timestamp: Date.now() + 1,
    });
    expect(activities).toHaveLength(0);
  });
  test("백그라운드 권한 거부를 알리고 포그라운드 동작을 유지한다", async () => {
    backgroundAllowed = false;
    await service.syncRideTracking(ride, plan);
    expect(getRideTrackingStatus().active).toBe(true);
    expect(getRideTrackingStatus().background).toBe(false);
    expect(getRideTrackingStatus().error).toContain("항상");
    await service.updateRideLocation({
      latitude: 37,
      longitude: 127.01,
      accuracy: 10,
      timestamp: Date.now(),
    });
    expect(getRideTrackingStatus().error).toContain("항상");
  });
  test("일시 정지는 플랜 새로고침이나 앱 복귀로 풀리지 않는다", async () => {
    await service.syncRideTracking(ride, plan);
    await service.pauseRideTracking();
    await service.syncRideTracking(ride, { ...plan });
    await service.refreshRideTracking();
    expect(activities).toHaveLength(0);
    expect(locationRunning).toBe(false);
    await service.resumeRideTracking();
    expect(activities).toHaveLength(1);
    expect(locationRunning).toBe(true);
  });
  test("종료된 활동은 잠금 중 다시 만들지 않고 앱 복귀 시 복원한다", async () => {
    await service.syncRideTracking(ride, plan);
    activities.splice(0);
    appState.currentState = "background";
    await service.updateRideLocation({
      latitude: 37,
      longitude: 127.01,
      accuracy: 10,
      timestamp: Date.now(),
    });
    expect(starts).toBe(1);
    expect(getRideTrackingStatus().active).toBe(false);
    appState.currentState = "active";
    await service.refreshRideTracking();
    expect(starts).toBe(2);
  });
  test("연속 갱신은 활동을 중복 생성하지 않으며 GPS마다 전체 경로를 저장하지 않는다", async () => {
    await service.syncRideTracking(ride, plan);
    await service.syncRideTracking(ride, plan);
    await service.refreshRideTracking();
    expect(starts).toBe(1);
    const storedState = JSON.parse(storage.get("plan-my-route:live-ride:v1")!);
    expect(storedState.plan).toBeUndefined();
    expect(storage.has("plan-my-route:live-ride-plan:v1")).toBe(true);
  });
  test("7시간이 지난 활동은 잠금 중 유지하고 앱 복귀 때 교체한다", async () => {
    await service.syncRideTracking(ride, plan);
    const now = Date.now();
    const clock = spyOn(Date, "now").mockReturnValue(now + 7 * 60 * 60 * 1000 + 1000);
    try {
      appState.currentState = "background";
      await service.refreshRideTracking();
      expect(starts).toBe(1);
      appState.currentState = "active";
      await service.refreshRideTracking();
      expect(starts).toBe(2);
      expect(activities).toHaveLength(1);
    } finally {
      clock.mockRestore();
    }
  });
  test("경로를 다시 받지 못해도 저장된 플랜으로 갱신한다", async () => {
    await service.syncRideTracking(ride, plan);
    await service.syncRideTracking(ride);
    await service.updateRideLocation({
      latitude: 37,
      longitude: 127.01,
      accuracy: 10,
      timestamp: Date.now(),
    });
    expect(activities[0].update.mock.calls.at(-1)?.[0].primaryName).toBe("실제 보급");
  });
  test("잘못된 GPS 이후 앱 복귀가 마지막 정상 거리를 현재 거리로 되살리지 않는다", async () => {
    await service.syncRideTracking(ride, plan);
    const timestamp = Date.now();
    await service.updateRideLocation({ latitude: 37, longitude: 127.01, accuracy: 10, timestamp });
    await service.updateRideLocation({
      latitude: 38,
      longitude: 127.01,
      accuracy: 10,
      timestamp: timestamp + 1,
    });
    await service.refreshRideTracking();
    expect(activities[0].update.mock.calls.at(-1)?.[0].primaryDistance).toBe("—");
    expect(getRideTrackingStatus().message).toContain("경로 밖");
  });
});
