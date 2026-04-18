import { Stack } from 'expo-router';

export default function PlanDetailLayout() {
  return (
    <Stack screenOptions={{ headerShown: true }}>
      <Stack.Screen name="summary" options={{ title: '요약' }} />
      <Stack.Screen name="schedule" options={{ title: '일정' }} />
      <Stack.Screen name="map" options={{ title: '맵' }} />
      <Stack.Screen name="stages/[dayNumber]/index" options={{ title: '스테이지' }} />
      <Stack.Screen
        name="stages/[dayNumber]/edit"
        options={{ presentation: 'modal', title: '스테이지 편집' }}
      />
    </Stack>
  );
}
