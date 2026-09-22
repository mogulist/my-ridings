import {
  planPoiBelongsToStage,
  snapPlanPoisToTrack,
} from "@my-ridings/plan-geometry";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { AppIcon } from "@/components/ui/icon";
import { PressableHaptic } from "@/components/ui/pressable-haptic";
import { Radius, Spacing } from "@/constants/theme";
import {
  type MobilePlanStageRow,
  patchPlanPoi,
  type PlanPoiRow,
  type TrackPoint,
} from "@/features/api/plan-my-route";
import { getApiOrigin, getStoredAccessToken } from "@/features/auth/session";
import { planDetailQueryKey } from "@/features/plan-my-route/plan-detail-query";
import { useTheme } from "@/hooks/use-theme";

type SupplyStop = {
  poi: PlanPoiRow;
  distanceKm: number;
};

type SupplyStopsProps = {
  planId: string;
  stage: MobilePlanStageRow;
  planPois: PlanPoiRow[];
  trackPoints: TrackPoint[];
  currentKm: number | null;
  onMessage: (message: string) => void;
};

const STATUS_LABEL: Record<PlanPoiRow["intent"], string> = {
  candidate: "후보",
  planned: "들를 곳",
  confirmed: "들림",
};

export function SupplyStops({
  planId,
  stage,
  planPois,
  trackPoints,
  currentKm,
  onMessage,
}: SupplyStopsProps) {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const [savingId, setSavingId] = useState<string | null>(null);
  const poiById = new Map(planPois.map((poi) => [poi.id, poi]));
  const stageRange = {
    id: stage.id,
    startDistanceKm: (stage.start_distance ?? 0) / 1000,
    endDistanceKm: (stage.end_distance ?? stage.start_distance ?? 0) / 1000,
  };
  const stops = snapPlanPoisToTrack(planPois, trackPoints)
    .flatMap((snapped): SupplyStop[] => {
      const poi = poiById.get(snapped.id);
      if (
        !poi ||
        (poi.poi_type !== "convenience" && poi.poi_type !== "mart") ||
        !planPoiBelongsToStage(snapped, stageRange)
      ) {
        return [];
      }
      return [{ poi, distanceKm: snapped.distanceKm }];
    })
    .sort((a, b) => a.distanceKm - b.distanceKm);

  if (stops.length === 0) return null;

  const updateStatus = async (stop: SupplyStop, intent: PlanPoiRow["intent"]) => {
    if (savingId) return;
    const apiOrigin = getApiOrigin();
    if (!apiOrigin) {
      onMessage("앱 서버 주소가 설정되지 않았습니다.");
      return;
    }
    const accessToken = await getStoredAccessToken();
    if (!accessToken) {
      onMessage("다시 로그인해 주세요.");
      return;
    }

    setSavingId(stop.poi.id);
    try {
      await patchPlanPoi(apiOrigin, accessToken, planId, stop.poi.id, { intent });
      await queryClient.invalidateQueries({ queryKey: planDetailQueryKey(planId) });
      onMessage(`${stop.poi.name}: ${STATUS_LABEL[intent]}`);
    } catch (error) {
      onMessage(error instanceof Error ? error.message : "보급소 상태를 저장하지 못했습니다.");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <View style={styles.section}>
      <View style={styles.heading}>
        <View style={styles.titleRow}>
          <AppIcon name="basket.fill" size={18} tintColor={theme.success} />
          <ThemedText type="headline">보급소</ThemedText>
        </View>
        <ThemedText type="caption" themeColor="textSecondary">
          후보를 정하고, 들른 뒤 바로 표시하세요
        </ThemedText>
      </View>

      <View style={[styles.list, { borderColor: theme.separator }]}>
        {stops.map((stop, index) => {
          const isSaving = savingId === stop.poi.id;
          const remainingKm =
            currentKm == null ? null : Math.max(0, stop.distanceKm - currentKm);
          return (
            <View
              key={stop.poi.id}
              style={[
                styles.row,
                index > 0 && styles.rowBorder,
                index > 0 && { borderTopColor: theme.separator },
                stop.poi.intent === "confirmed" && styles.visitedRow,
              ]}
            >
              <View style={styles.body}>
                <View style={styles.nameRow}>
                  <ThemedText type="smallBold" numberOfLines={1} style={styles.name}>
                    {stop.poi.name}
                  </ThemedText>
                  <View
                    style={[
                      styles.badge,
                      {
                        backgroundColor:
                          stop.poi.intent === "confirmed"
                            ? `${theme.success}24`
                            : stop.poi.intent === "planned"
                              ? `${theme.tint}20`
                              : theme.backgroundElement,
                      },
                    ]}
                  >
                    <ThemedText type="caption">{STATUS_LABEL[stop.poi.intent]}</ThemedText>
                  </View>
                </View>
                <ThemedText type="caption" themeColor="textSecondary">
                  {remainingKm == null
                    ? `경로 ${stop.distanceKm.toFixed(1)}km`
                    : remainingKm > 0.05
                      ? `${remainingKm.toFixed(1)}km 남음`
                      : "현재 지점"}
                </ThemedText>
              </View>

              {stop.poi.intent === "candidate" ? (
                <StatusButton
                  label="들를 곳"
                  disabled={Boolean(savingId)}
                  color={theme.tint}
                  onPress={() => void updateStatus(stop, "planned")}
                />
              ) : stop.poi.intent === "planned" ? (
                <View style={styles.actions}>
                  <StatusButton
                    label="후보로"
                    disabled={Boolean(savingId)}
                    color={theme.textSecondary}
                    onPress={() => void updateStatus(stop, "candidate")}
                  />
                  <StatusButton
                    label={isSaving ? "저장 중" : "들림"}
                    disabled={Boolean(savingId)}
                    color={theme.success}
                    onPress={() => void updateStatus(stop, "confirmed")}
                  />
                </View>
              ) : (
                <StatusButton
                  label="되돌리기"
                  disabled={Boolean(savingId)}
                  color={theme.textSecondary}
                  onPress={() => void updateStatus(stop, "candidate")}
                />
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

function StatusButton({
  label,
  disabled,
  color,
  onPress,
}: {
  label: string;
  disabled: boolean;
  color: string;
  onPress: () => void;
}) {
  return (
    <PressableHaptic
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      style={[styles.button, { borderColor: color }, disabled && styles.disabled]}
      onPress={onPress}
    >
      <ThemedText type="caption" style={{ color }}>
        {label}
      </ThemedText>
    </PressableHaptic>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.two,
  },
  heading: {
    gap: Spacing.half,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
  },
  list: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.md,
    overflow: "hidden",
  },
  row: {
    minHeight: 64,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
  },
  rowBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  visitedRow: {
    opacity: 0.58,
  },
  body: {
    flex: 1,
    minWidth: 0,
    gap: Spacing.half,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.one,
  },
  name: {
    flexShrink: 1,
  },
  badge: {
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
  },
  actions: {
    alignItems: "flex-end",
    gap: Spacing.one,
  },
  button: {
    minHeight: 36,
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.two,
  },
  disabled: {
    opacity: 0.45,
  },
});
