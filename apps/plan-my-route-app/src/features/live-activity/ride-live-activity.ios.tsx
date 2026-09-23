import { HStack, Image, Spacer, Text, VStack } from "@expo/ui/swift-ui";
import { font, foregroundStyle, frame, padding } from "@expo/ui/swift-ui/modifiers";
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
            <Text modifiers={[font({ size: 18, weight: "bold", design: "rounded" })]}>
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

        {props.nextSupplyName && props.nextSupplyDistance && props.nextSupplyAscent ? (
          <HStack spacing={8} alignment="center">
            <Image systemName="2.circle.fill" color="#8E8E93" />
            <Text modifiers={[font({ size: 15, weight: "semibold", design: "rounded" })]}>
              {props.nextSupplyName}
            </Text>
            <Spacer />
            <VStack alignment="trailing" spacing={0}>
              <Text
                modifiers={[
                  font({ size: 15, weight: "semibold", design: "rounded" }),
                  foregroundStyle({ type: "hierarchical", style: "secondary" }),
                ]}
              >
                {props.nextSupplyDistance}
              </Text>
              <Text
                modifiers={[
                  font({ size: 12, weight: "semibold", design: "rounded" }),
                  foregroundStyle({ type: "hierarchical", style: "secondary" }),
                ]}
              >
                {props.nextSupplyAscent}
              </Text>
            </VStack>
          </HStack>
        ) : null}

        {props.thirdSupplyName && props.thirdSupplyDistance && props.thirdSupplyAscent ? (
          <HStack spacing={8} alignment="center">
            <Image systemName="3.circle.fill" color="#8E8E93" />
            <Text modifiers={[font({ size: 15, weight: "semibold", design: "rounded" })]}>
              {props.thirdSupplyName}
            </Text>
            <Spacer />
            <VStack alignment="trailing" spacing={0}>
              <Text
                modifiers={[
                  font({ size: 15, weight: "semibold", design: "rounded" }),
                  foregroundStyle({ type: "hierarchical", style: "secondary" }),
                ]}
              >
                {props.thirdSupplyDistance}
              </Text>
              <Text
                modifiers={[
                  font({ size: 12, weight: "semibold", design: "rounded" }),
                  foregroundStyle({ type: "hierarchical", style: "secondary" }),
                ]}
              >
                {props.thirdSupplyAscent}
              </Text>
            </VStack>
          </HStack>
        ) : null}
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
