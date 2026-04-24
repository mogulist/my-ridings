import type { ReactNode } from "react";
import { createContext, useContext, useMemo } from "react";
import { type SharedValue, useSharedValue } from "react-native-reanimated";

type SyncedHorizontalScrollContextValue = {
	scrollX: SharedValue<number>;
	activeId: SharedValue<number>;
};

const NO_ACTIVE_ID = -1;

const SyncedHorizontalScrollContext = createContext<SyncedHorizontalScrollContextValue | null>(
	null,
);

type SyncedHorizontalScrollProviderProps = {
	children: ReactNode;
};

export function SyncedHorizontalScrollProvider({ children }: SyncedHorizontalScrollProviderProps) {
	const scrollX = useSharedValue(0);
	const activeId = useSharedValue(NO_ACTIVE_ID);

	const value = useMemo(() => ({ scrollX, activeId }), [scrollX, activeId]);

	return (
		<SyncedHorizontalScrollContext.Provider value={value}>
			{children}
		</SyncedHorizontalScrollContext.Provider>
	);
}

export function useSyncedHorizontalScroll() {
	return useContext(SyncedHorizontalScrollContext);
}

export { NO_ACTIVE_ID };
