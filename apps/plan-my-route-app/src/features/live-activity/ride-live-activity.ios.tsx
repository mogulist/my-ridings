import { HStack, Image, Spacer, Text, VStack } from "@expo/ui/swift-ui";
import { font, foregroundStyle, frame, lineLimit, padding } from "@expo/ui/swift-ui/modifiers";
import { createLiveActivity } from "expo-widgets";

import type { RideLiveActivityProps } from "./mock-ride-snapshots";

const RideLiveActivity = (props: RideLiveActivityProps) => {
	"widget";

	return {
		banner: (
			<VStack
				alignment="leading"
				spacing={5}
				modifiers={[
					padding({ horizontal: 16, vertical: 10 }),
					frame({ maxWidth: Infinity, maxHeight: 160, alignment: "topLeading" }),
				]}
			>
				<HStack spacing={8} alignment="center">
					{props.nextSupplyName ? (
						<Image systemName="1.circle.fill" color={props.accentColor} />
					) : null}
					<VStack alignment="leading" spacing={1}>
						<Text
							modifiers={[
								font({ size: 11, weight: "semibold" }),
								foregroundStyle(props.accentColor),
							]}
						>
							{props.primaryLabel}
						</Text>
						<Text modifiers={[font({ size: 16, weight: "bold", design: "rounded" }), lineLimit(1)]}>
							{props.primaryName}
						</Text>
					</VStack>
					<Spacer />
					<VStack alignment="trailing" spacing={1}>
						<Text
							modifiers={[
								font({ size: 19, weight: "bold", design: "rounded" }),
								foregroundStyle(props.accentColor),
							]}
						>
							{props.primaryDistance}
						</Text>
						<Text
							modifiers={[
								font({ size: 12, weight: "semibold", design: "rounded" }),
								foregroundStyle({ type: "hierarchical", style: "secondary" }),
							]}
						>
							{props.primaryAscent}
						</Text>
					</VStack>
				</HStack>

				{props.primaryTerrain ? (
					<Text
						modifiers={[
							font({ size: 11, weight: "medium" }),
							lineLimit(1),
							foregroundStyle({ type: "hierarchical", style: "secondary" }),
						]}
					>
						{props.primaryTerrain}
					</Text>
				) : null}
				{props.climbLabel ? (
					<VStack alignment="leading" spacing={2}>
						<HStack spacing={8}>
							<Text modifiers={[font({ size: 12, weight: "semibold" }), lineLimit(1)]}>
								{props.climbLabel}
							</Text>
							<Spacer />
							<Text modifiers={[font({ size: 13, weight: "bold", design: "rounded" })]}>
								{props.climbDistance}
							</Text>
						</HStack>
						<Text
							modifiers={[
								font({ size: 11 }),
								lineLimit(1),
								foregroundStyle({ type: "hierarchical", style: "secondary" }),
							]}
						>
							{props.climbTerrain}
						</Text>
					</VStack>
				) : null}
				{props.climbStats ? (
					<Text modifiers={[font({ size: 11 }), lineLimit(1)]}>{props.climbStats}</Text>
				) : null}
				<HStack spacing={8}>
					<Text
						modifiers={[
							font({ size: 10 }),
							foregroundStyle({ type: "hierarchical", style: "secondary" }),
						]}
					>
						{props.secondaryLabel}
					</Text>
					<Spacer />
					<Text
						modifiers={[
							font({ size: 10 }),
							lineLimit(1),
							foregroundStyle({ type: "hierarchical", style: "secondary" }),
						]}
					>
						{props.secondaryValue}
					</Text>
				</HStack>
			</VStack>
		),
		compactLeading: <Image systemName="bicycle" color="#0A84FF" />,
		compactTrailing: (
			<Text modifiers={[font({ size: 13, weight: "semibold", design: "rounded" })]}>
				{props.remainingLabel}
			</Text>
		),
		minimal: <Image systemName="bicycle" color="#0A84FF" />,
		expandedLeading: (
			<VStack alignment="leading" spacing={2} modifiers={[padding({ leading: 4 })]}>
				<Image systemName="bicycle" color="#0A84FF" />
				<Text modifiers={[font({ size: 11, weight: "semibold" })]}>{props.stageLabel}</Text>
			</VStack>
		),
		expandedTrailing: (
			<VStack alignment="trailing" spacing={2} modifiers={[padding({ trailing: 4 })]}>
				<Text modifiers={[font({ size: 18, weight: "bold", design: "rounded" })]}>
					{props.primaryDistance}
				</Text>
				<Text
					modifiers={[
						font({ size: 11, weight: "medium" }),
						foregroundStyle({ type: "hierarchical", style: "secondary" }),
					]}
				>
					{props.primaryLabel}
				</Text>
			</VStack>
		),
		expandedBottom: (
			<VStack alignment="leading" spacing={5} modifiers={[padding({ horizontal: 10, bottom: 6 })]}>
				<Text modifiers={[font({ size: 15, weight: "bold", design: "rounded" })]}>
					{props.primaryName}
				</Text>
				<HStack spacing={6}>
					<Text
						modifiers={[
							font({ size: 12, weight: "medium" }),
							foregroundStyle({ type: "hierarchical", style: "secondary" }),
						]}
					>
						{props.primaryTerrain ?? props.secondaryLabel}
					</Text>
					<Spacer />
					<Text modifiers={[font({ size: 12, weight: "semibold" })]}>
						{props.climbDistance ?? props.secondaryValue}
					</Text>
				</HStack>
			</VStack>
		),
	};
};

export default createLiveActivity<RideLiveActivityProps>("RideLiveActivity", RideLiveActivity);
