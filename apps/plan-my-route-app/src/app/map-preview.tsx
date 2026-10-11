import { ThemedText } from "@/components/themed-text";
export default function MapPreview() {
	return __DEV__ ? (
		<ThemedText>지도 예시는 iOS/Android 개발 빌드에서 확인하세요.</ThemedText>
	) : null;
}
