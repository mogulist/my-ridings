import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import { DEFAULT_TERRAIN_SPEEDS, parseTerrainSpeeds, type TerrainSpeeds } from "./terrain-time";
const KEY = "terrain-moving-speeds:v1";
export function useTerrainSpeeds() {
	const [speeds, setSpeeds] = useState<TerrainSpeeds>(DEFAULT_TERRAIN_SPEEDS),
		[ready, setReady] = useState(false),
		[loadError, setLoadError] = useState<string | null>(null);
	useEffect(() => {
		let active = true;
		void AsyncStorage.getItem(KEY)
			.then((value) => {
				if (!active) return;
				if (value) {
					try {
						const parsed = parseTerrainSpeeds(JSON.parse(value));
						if (parsed) setSpeeds(parsed);
						else setLoadError("저장된 속도 기준이 잘못되어 기본값을 사용합니다.");
					} catch {
						setLoadError("저장된 속도 기준이 잘못되어 기본값을 사용합니다.");
					}
				}
			})
			.catch(() => {
				if (active) setLoadError("속도 기준을 불러오지 못해 기본값을 사용합니다.");
			})
			.finally(() => {
				if (active) setReady(true);
			});
		return () => {
			active = false;
		};
	}, []);
	const save = async (value: TerrainSpeeds) => {
		if (!parseTerrainSpeeds(value)) throw new Error("각 속도를 1–80km/h 범위로 입력해 주세요.");
		await AsyncStorage.setItem(KEY, JSON.stringify(value));
		setSpeeds(value);
		setLoadError(null);
	};
	return { speeds, ready, save, loadError };
}
