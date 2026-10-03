import "react-native-get-random-values";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import * as aesjs from "aes-js";
import * as SecureStore from "expo-secure-store";

const configuredSupabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ?? "";
const configuredSupabaseKey = (
	process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
	process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
	""
).trim();

export const isSupabaseConfigured = Boolean(configuredSupabaseUrl && configuredSupabaseKey);

// Supabase SDK는 빈 URL에서 모듈 import 자체를 실패시킨다. 설정이 빠진 개발 환경에서도
// 로그인 화면이 원인을 안내할 수 있도록, 네트워크에 사용되지 않을 유효 형식의 값을 넣는다.
const supabaseUrl = configuredSupabaseUrl || "https://missing-config.supabase.co";
const supabaseKey = configuredSupabaseKey || "sb_publishable_missing_config";

const largeSecureStore = {
	async getItem(key: string) {
		const encryptedValue = await AsyncStorage.getItem(key);
		if (!encryptedValue) return null;

		const encryptionKey = await SecureStore.getItemAsync(key);
		if (!encryptionKey) return null;

		const cipher = new aesjs.ModeOfOperation.ctr(
			aesjs.utils.hex.toBytes(encryptionKey),
			new aesjs.Counter(1),
		);
		const decryptedBytes = cipher.decrypt(aesjs.utils.hex.toBytes(encryptedValue));
		return aesjs.utils.utf8.fromBytes(decryptedBytes);
	},
	async setItem(key: string, value: string) {
		const encryptionKey = crypto.getRandomValues(new Uint8Array(32));
		const cipher = new aesjs.ModeOfOperation.ctr(encryptionKey, new aesjs.Counter(1));
		const encryptedBytes = cipher.encrypt(aesjs.utils.utf8.toBytes(value));

		await SecureStore.setItemAsync(key, aesjs.utils.hex.fromBytes(encryptionKey));
		await AsyncStorage.setItem(key, aesjs.utils.hex.fromBytes(encryptedBytes));
	},
	async removeItem(key: string) {
		await AsyncStorage.removeItem(key);
		await SecureStore.deleteItemAsync(key);
	},
};

export const SUPABASE = createClient(supabaseUrl, supabaseKey, {
	auth: {
		storage: largeSecureStore,
		flowType: "pkce",
		autoRefreshToken: true,
		persistSession: true,
		detectSessionInUrl: false,
	},
});
