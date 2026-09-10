import "react-native-get-random-values";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import * as aesjs from "aes-js";
import * as SecureStore from "expo-secure-store";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const supabaseKey =
	process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
	process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
	"";

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
