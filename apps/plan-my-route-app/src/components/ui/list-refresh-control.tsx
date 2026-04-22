import { Platform, RefreshControl } from "react-native";

import { useTheme } from "@/hooks/use-theme";

export type ListRefreshControlProps = {
	refreshing: boolean;
	onRefresh: () => void;
};

export function ListRefreshControl({ refreshing, onRefresh }: ListRefreshControlProps) {
	const theme = useTheme();
	return (
		<RefreshControl
			refreshing={refreshing}
			onRefresh={onRefresh}
			tintColor={theme.tint}
			colors={Platform.OS === "android" ? [theme.tint] : undefined}
		/>
	);
}
