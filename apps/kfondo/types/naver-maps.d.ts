declare global {
  interface Window {
    naver?: {
      maps: {
        Map: new (
          element: HTMLElement,
          options: Record<string, unknown>,
        ) => NaverMapInstance;
        LatLng: new (lat: number, lng: number) => unknown;
        LatLngBounds: new () => NaverLatLngBounds;
        Polyline: new (options: {
          path: unknown[];
          map: unknown;
          strokeColor?: string;
          strokeWeight?: number;
        }) => unknown;
        Marker: new (options: {
          position: unknown;
          map: unknown;
        }) => NaverMarkerInstance;
      };
    };
  }
}

export type NaverLatLng = {
  lat: () => number;
  lng: () => number;
};

export type FitBoundsOptions = {
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
  maxZoom?: number;
};

export type NaverMapInstance = {
  fitBounds: (bounds: NaverLatLngBounds, options?: FitBoundsOptions) => void;
  getZoom: () => number;
  setZoom: (level: number) => void;
  getCenter: () => NaverLatLng;
  setCenter: (center: unknown) => void;
};

export type NaverLatLngBounds = {
  extend: (point: unknown) => void;
};

export type NaverMarkerInstance = {
  setMap: (map: unknown) => void;
};
