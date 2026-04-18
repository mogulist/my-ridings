import { Stack } from 'expo-router';

export default function RoutePlansSegmentLayout() {
  return (
    <Stack screenOptions={{ headerShown: true }}>
      <Stack.Screen name="index" options={{ title: '플랜 목록' }} />
      <Stack.Screen name="[planId]" options={{ headerShown: false }} />
    </Stack>
  );
}
