import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { Fragment } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';

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

export function PlanDetailFloatingTabs({
	activeTab,
	bottomInset,
	onSelectTab,
}: PlanDetailFloatingTabsProps) {
	const useGlass = Platform.OS === 'ios' && isLiquidGlassAvailable();

	const row = (
		<View style={styles.row}>
			{TABS.map((tab, index) => (
				<Fragment key={tab}>
					{index > 0 ? (
						<ThemedText style={styles.dot} type="small" themeColor="textSecondary">
							{' · '}
						</ThemedText>
					) : null}
					<Pressable
						accessibilityRole="tab"
						accessibilityState={{ selected: activeTab === tab }}
						style={({ pressed }) => [
							styles.pressable,
							activeTab === tab ? styles.pressableSelected : null,
							pressed ? styles.pressablePressed : null,
						]}
						onPress={() => {
							onSelectTab(tab);
						}}>
						<ThemedText
							type={activeTab === tab ? 'smallBold' : 'small'}
							themeColor={activeTab === tab ? 'text' : 'textSecondary'}>
							{LABELS[tab]}
						</ThemedText>
					</Pressable>
				</Fragment>
			))}
		</View>
	);

	const chromeStyle = [styles.pillChrome, styles.fallbackFill, styles.chromeShadow];

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
		paddingVertical: 10,
		paddingHorizontal: 18,
		overflow: 'hidden',
	},
	fallbackFill: {
		backgroundColor:
			Platform.OS === 'ios' ? 'rgba(255, 255, 255, 0.74)' : 'rgba(249, 249, 251, 0.94)',
	},
	chromeShadow:
		Platform.OS === 'ios'
			? {
					boxShadow: '0px 6px 24px rgba(0, 0, 0, 0.12)',
				}
			: {
					boxShadow: '0px 4px 18px rgba(0, 0, 0, 0.14)',
				},
	row: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	dot: {
		opacity: 0.85,
	},
	pressable: {
		paddingVertical: 4,
		paddingHorizontal: 6,
		borderRadius: 999,
	},
	pressableSelected: {
		backgroundColor: 'rgba(0, 0, 0, 0.06)',
	},
	pressablePressed: {
		opacity: 0.88,
	},
});
