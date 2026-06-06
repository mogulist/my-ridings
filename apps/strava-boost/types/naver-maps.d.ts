declare global {
  interface Window {
    naver?: {
      maps: {
        Map: new (element: HTMLElement, options: Record<string, unknown>) => NaverMapInstance;
        LatLng: new (lat: number, lng: number) => unknown;
        LatLngBounds: new () => NaverLatLngBounds;
        Polyline: new (options: {
          path: unknown[];
          map: unknown;
          strokeColor?: string;
          strokeWeight?: number;
        }) => unknown;
        Marker: new (options: { position: unknown; map: unknown; icon?: unknown }) => unknown;
        Point?: new (x: number, y: number) => unknown;
      };
    };
  }
}

export type NaverMapInstance = {
  fitBounds: (bounds: NaverLatLngBounds, options?: FitBoundsOptions) => void;
  getZoom: () => number;
  setZoom: (level: number) => void;
  getCenter: () => unknown;
  setCenter: (center: unknown) => void;
  autoResize?: () => void;
};

export type NaverLatLngBounds = {
  extend: (point: unknown) => void;
};

export type FitBoundsOptions = {
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
};
