export type RideTrackingStatus = {
  planId: string | null;
  active: boolean;
  background: boolean;
  paused: boolean;
  currentKm: number | null;
  updatedAt: number | null;
  message: string;
  error: string | null;
};

let status: RideTrackingStatus = {
  planId: null,
  active: false,
  background: false,
  paused: false,
  currentKm: null,
  updatedAt: null,
  message: "라이딩을 시작하면 잠금화면에 보급소가 표시됩니다.",
  error: null,
};
const listeners = new Set<() => void>();

export function getRideTrackingStatus() {
  return status;
}
export function subscribeRideTracking(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
export function setRideTrackingStatus(update: Partial<RideTrackingStatus>) {
  status = { ...status, ...update };
  listeners.forEach((listener) => listener());
}
