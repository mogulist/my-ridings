import { HStack, Image, ProgressView, Spacer, Text, VStack } from "@expo/ui/swift-ui";
import {
  font,
  foregroundStyle,
  frame,
  padding,
  progressViewStyle,
  tint,
} from "@expo/ui/swift-ui/modifiers";
import { createLiveActivity } from "expo-widgets";

import type { RideLiveActivityProps } from "./mock-ride-snapshots";

const RideLiveActivity = (props: RideLiveActivityProps) => {
  "widget";

  return {
    banner: (
      <VStack
        alignment="leading"
        spacing={9}
        modifiers={[padding({ horizontal: 16, vertical: 13 }), frame({ maxWidth: Infinity })]}
      >
        <HStack spacing={7}>
          <Image systemName="bicycle" color="#0A84FF" />
          <Text modifiers={[font({ size: 14, weight: "semibold", design: "rounded" })]}>
            {props.stageLabel} · {props.phaseLabel}
          </Text>
          <Spacer />
          <Text
            modifiers={[
              font({ size: 13, weight: "medium", design: "rounded" }),
              foregroundStyle({ type: "hierarchical", style: "secondary" }),
            ]}
          >
            {props.progressLabel}
          </Text>
        </HStack>

        <ProgressView
          value={props.progress}
          modifiers={[progressViewStyle("linear"), tint("#0A84FF"), frame({ maxWidth: Infinity })]}
        />

        <HStack spacing={10} alignment="firstTextBaseline">
          <VStack alignment="leading" spacing={2}>
            <Text
              modifiers={[
                font({ size: 12, weight: "semibold" }),
                foregroundStyle(props.accentColor),
              ]}
            >
              {props.primaryLabel}
            </Text>
            <Text modifiers={[font({ size: 19, weight: "bold", design: "rounded" })]}>
              {props.primaryName}
            </Text>
          </VStack>
          <Spacer />
          <Text
            modifiers={[
              font({ size: 20, weight: "bold", design: "rounded" }),
              foregroundStyle(props.accentColor),
            ]}
          >
            {props.primaryDistance}
          </Text>
        </HStack>

        <HStack spacing={8}>
          <Image
            systemName={props.phase === "lodging" ? "bed.double.fill" : "mountain.2.fill"}
            color="#8E8E93"
          />
          <Text
            modifiers={[
              font({ size: 13, weight: "medium" }),
              foregroundStyle({ type: "hierarchical", style: "secondary" }),
            ]}
          >
            {props.secondaryLabel}
          </Text>
          <Spacer />
          <Text modifiers={[font({ size: 13, weight: "semibold", design: "rounded" })]}>
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
            {props.secondaryLabel}
          </Text>
          <Spacer />
          <Text modifiers={[font({ size: 12, weight: "semibold" })]}>{props.secondaryValue}</Text>
        </HStack>
      </VStack>
    ),
  };
};

export default createLiveActivity<RideLiveActivityProps>("RideLiveActivity", RideLiveActivity);
