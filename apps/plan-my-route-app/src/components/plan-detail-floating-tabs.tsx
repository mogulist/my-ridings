import * as Haptics from 'expo-haptics';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { useEffect } from 'react';
import { LayoutChangeEvent, Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withSpring,
} from 'react-native-reanimated';

import { AppIcon } from '@/components/ui/icon';
import { ThemedText } from '@/components/themed-text';
import { Shadow } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';

export type PlanDetailTabKey = 'summary' | 'schedule' | 'map';

type PlanDetailFloatingTabsProps = {
	activeTab: PlanDetailTabKey;
	bottomInset: number;
	onSelectTab: (tab: PlanDetailTabKey) => void;
};

const TABS: PlanDetailTabKey[] = ['summary', 'schedule', 'map'];

const LABELS: Record<PlanDetailTabKey, string> = {
	summary: '요약',
	schedule: '일정',
	map: '맵',
};

const ICONS: Record<PlanDetailTabKey, string> = {
	summary: 'chart.bar.xaxis',
	schedule: 'calendar',
	map: 'map',
};

export function PlanDetailFloatingTabs({
	activeTab,
	bottomInset,
	onSelectTab,
}: PlanDetailFloatingTabsProps) {
	const theme = useTheme();
	const colorScheme = useColorScheme();
	const useGlass = Platform.OS === 'ios' && isLiquidGlassAvailable();
	const isDark = colorScheme === 'dark';

	const segmentWidth = useSharedValue(0);
	const activeIndex = useSharedValue(TABS.indexOf(activeTab));

	useEffect(() => {
		activeIndex.value = withSpring(TABS.indexOf(activeTab), { damping: 18, stiffness: 180 });
	}, [activeIndex, activeTab]);

	const onRowLayout = (e: LayoutChangeEvent) => {
		const w = e.nativeEvent.layout.width;
		segmentWidth.value = w / TABS.length;
	};

	const indicatorStyle = useAnimatedStyle(() => {
		const seg = segmentWidth.value;
		const idx = activeIndex.value;
		return {
			width: seg,
			transform: [{ translateX: idx * seg }],
		};
	});

	const row = (
		<View style={styles.rowWrap} onLayout={onRowLayout}>
			<Animated.View
				style={[
					styles.indicator,
					{ backgroundColor: `${theme.tint}24` },
					indicatorStyle,
				]}
			/>
			<View style={styles.row}>
				{TABS.map((tab) => {
					const selected = activeTab === tab;
					return (
						<Pressable
							key={tab}
							accessibilityRole="tab"
							accessibilityState={{ selected }}
							style={({ pressed }) => [
								styles.tabCell,
								pressed ? styles.pressablePressed : null,
							]}
							onPress={() => {
								if (Platform.OS === 'ios') {
									void Haptics.selectionAsync();
								}
								onSelectTab(tab);
							}}>
							<AppIcon
								name={ICONS[tab]}
								size={16}
								tintColor={selected ? theme.tint : theme.textSecondary}
							/>
							<ThemedText
								type={selected ? 'smallBold' : 'small'}
								themeColor={selected ? 'text' : 'textSecondary'}>
								{LABELS[tab]}
							</ThemedText>
						</Pressable>
					);
				})}
			</View>
		</View>
	);

	const fallbackFill = isDark ? 'rgba(28, 28, 30, 0.72)' : 'rgba(255, 255, 255, 0.88)';
	const chromeShadow = isDark ? Shadow.floatingDark : Shadow.floating;

	const chromeStyle = [
		styles.pillChrome,
		{ backgroundColor: fallbackFill, boxShadow: chromeShadow },
	];

	return (
		<View style={[styles.anchor, { paddingBottom: bottomInset + 16 }]} pointerEvents="box-none">
			{useGlass ? (
				<GlassView glassEffectStyle="regular" isInteractive style={styles.pillChrome}>
					{row}
				</GlassView>
			) : (
				<View style={chromeStyle}>{row}</View>
			)}
		</View>
	);
}

const styles = StyleSheet.create({
	anchor: {
		position: 'absolute',
		left: 0,
		right: 0,
		bottom: 0,
		alignItems: 'center',
	},
	pillChrome: {
		borderRadius: 999,
		borderCurve: 'continuous',
		paddingVertical: 9,
		paddingHorizontal: 14,
		overflow: 'hidden',
	},
	rowWrap: {
		position: 'relative',
		minWidth: 220,
	},
	row: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	indicator: {
		position: 'absolute',
		left: 0,
		top: 0,
		bottom: 0,
		borderRadius: 999,
		borderCurve: 'continuous',
	},
	tabCell: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 6,
		paddingVertical: 6,
		paddingHorizontal: 4,
		minWidth: 0,
	},
	pressablePressed: {
		opacity: 0.88,
	},
});
