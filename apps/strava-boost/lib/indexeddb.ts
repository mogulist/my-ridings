import type { StravaActivity } from "@/src/types";

const DB_NAME = "strava-stats";
const DB_VERSION = 2;
const STORE_NAMES = {
	TOKENS: "tokens",
	ACTIVITIES: "activities",
	SYNC_META: "sync_meta",
	GEAR: "gear",
} as const;

type TokenData = {
	accessToken: string;
	refreshToken: string;
	expiresAt: number;
	athleteId: number;
};

type SyncMeta = {
	lastSyncAt: number | null;
};

type GearData = {
	id: string;
	name: string;
};

let db: IDBDatabase | null = null;

const openDB = (): Promise<IDBDatabase> => {
	return new Promise((resolve, reject) => {
		if (db) {
			resolve(db);
			return;
		}

		const request = indexedDB.open(DB_NAME, DB_VERSION);

		request.onerror = () => reject(request.error);
		request.onsuccess = () => {
			db = request.result;
			resolve(db);
		};

		request.onupgradeneeded = (event) => {
			const database = (event.target as IDBOpenDBRequest).result;

			// Tokens store
			if (!database.objectStoreNames.contains(STORE_NAMES.TOKENS)) {
				const tokensStore = database.createObjectStore(STORE_NAMES.TOKENS, {
					keyPath: "id",
				});
				tokensStore.createIndex("athleteId", "athleteId", { unique: true });
			}

			// Activities store
			if (!database.objectStoreNames.contains(STORE_NAMES.ACTIVITIES)) {
				const activitiesStore = database.createObjectStore(STORE_NAMES.ACTIVITIES, {
					keyPath: "id",
				});
				activitiesStore.createIndex("startDate", "start_date_local", {
					unique: false,
				});
				activitiesStore.createIndex("type", "type", { unique: false });
			}

			// Sync metadata store
			if (!database.objectStoreNames.contains(STORE_NAMES.SYNC_META)) {
				database.createObjectStore(STORE_NAMES.SYNC_META, {
					keyPath: "id",
				});
			}

			// Gear store
			if (!database.objectStoreNames.contains(STORE_NAMES.GEAR)) {
				database.createObjectStore(STORE_NAMES.GEAR, {
					keyPath: "id",
				});
			}
		};
	});
};

export const dbUtils = {
	async getTokens(): Promise<TokenData | null> {
		const database = await openDB();
		return new Promise((resolve, reject) => {
			const transaction = database.transaction([STORE_NAMES.TOKENS], "readonly");
			const store = transaction.objectStore(STORE_NAMES.TOKENS);
			const request = store.get("tokens");

			request.onsuccess = () => {
				resolve(request.result || null);
			};
			request.onerror = () => reject(request.error);
		});
	},

	async saveTokens(tokenData: TokenData): Promise<void> {
		const database = await openDB();
		return new Promise((resolve, reject) => {
			const transaction = database.transaction([STORE_NAMES.TOKENS], "readwrite");
			const store = transaction.objectStore(STORE_NAMES.TOKENS);
			const request = store.put({ id: "tokens", ...tokenData });

			request.onsuccess = () => resolve();
			request.onerror = () => reject(request.error);
		});
	},

	async clearTokens(): Promise<void> {
		const database = await openDB();
		return new Promise((resolve, reject) => {
			const transaction = database.transaction([STORE_NAMES.TOKENS], "readwrite");
			const store = transaction.objectStore(STORE_NAMES.TOKENS);
			const request = store.delete("tokens");

			request.onsuccess = () => resolve();
			request.onerror = () => reject(request.error);
		});
	},

	async getLastSyncAt(): Promise<number | null> {
		const database = await openDB();
		return new Promise((resolve, reject) => {
			const transaction = database.transaction([STORE_NAMES.SYNC_META], "readonly");
			const store = transaction.objectStore(STORE_NAMES.SYNC_META);
			const request = store.get("meta");

			request.onsuccess = () => {
				const meta = request.result as SyncMeta | undefined;
				resolve(meta?.lastSyncAt || null);
			};
			request.onerror = () => reject(request.error);
		});
	},

	async saveLastSyncAt(timestamp: number): Promise<void> {
		const database = await openDB();
		return new Promise((resolve, reject) => {
			const transaction = database.transaction([STORE_NAMES.SYNC_META], "readwrite");
			const store = transaction.objectStore(STORE_NAMES.SYNC_META);
			const request = store.put({ id: "meta", lastSyncAt: timestamp });

			request.onsuccess = () => resolve();
			request.onerror = () => reject(request.error);
		});
	},

	async saveActivities(activities: StravaActivity[]): Promise<void> {
		if (activities.length === 0) return;

		const database = await openDB();
		return new Promise((resolve, reject) => {
			const transaction = database.transaction([STORE_NAMES.ACTIVITIES], "readwrite");
			const store = transaction.objectStore(STORE_NAMES.ACTIVITIES);

			let completed = 0;
			let hasError = false;

			activities.forEach((activity) => {
				const request = store.put(activity);
				request.onsuccess = () => {
					completed++;
					if (completed === activities.length && !hasError) {
						resolve();
					}
				};
				request.onerror = () => {
					if (!hasError) {
						hasError = true;
						reject(request.error);
					}
				};
			});
		});
	},

	async getAllActivities(): Promise<StravaActivity[]> {
		const database = await openDB();
		return new Promise((resolve, reject) => {
			const transaction = database.transaction([STORE_NAMES.ACTIVITIES], "readonly");
			const store = transaction.objectStore(STORE_NAMES.ACTIVITIES);
			const request = store.getAll();

			request.onsuccess = () => {
				resolve(request.result || []);
			};
			request.onerror = () => reject(request.error);
		});
	},

	async getActivitiesByType(type: string): Promise<StravaActivity[]> {
		const database = await openDB();
		return new Promise((resolve, reject) => {
			const transaction = database.transaction([STORE_NAMES.ACTIVITIES], "readonly");
			const store = transaction.objectStore(STORE_NAMES.ACTIVITIES);
			const index = store.index("type");
			const request = index.getAll(type);

			request.onsuccess = () => {
				resolve(request.result || []);
			};
			request.onerror = () => reject(request.error);
		});
	},

	async getActivitiesByDateRange(startDate: string, endDate: string): Promise<StravaActivity[]> {
		const database = await openDB();
		return new Promise((resolve, reject) => {
			const transaction = database.transaction([STORE_NAMES.ACTIVITIES], "readonly");
			const store = transaction.objectStore(STORE_NAMES.ACTIVITIES);
			const index = store.index("startDate");
			const range = IDBKeyRange.bound(startDate, endDate);
			const request = index.getAll(range);

			request.onsuccess = () => {
				resolve(request.result || []);
			};
			request.onerror = () => reject(request.error);
		});
	},

	async clearActivities(): Promise<void> {
		const database = await openDB();
		return new Promise((resolve, reject) => {
			const transaction = database.transaction([STORE_NAMES.ACTIVITIES], "readwrite");
			const store = transaction.objectStore(STORE_NAMES.ACTIVITIES);
			const request = store.clear();

			request.onsuccess = () => resolve();
			request.onerror = () => reject(request.error);
		});
	},

	async getGear(id: string): Promise<GearData | null> {
		const database = await openDB();
		return new Promise((resolve, reject) => {
			const transaction = database.transaction([STORE_NAMES.GEAR], "readonly");
			const store = transaction.objectStore(STORE_NAMES.GEAR);
			const request = store.get(id);

			request.onsuccess = () => {
				resolve(request.result || null);
			};
			request.onerror = () => reject(request.error);
		});
	},

	async saveGear(gear: GearData): Promise<void> {
		const database = await openDB();
		return new Promise((resolve, reject) => {
			const transaction = database.transaction([STORE_NAMES.GEAR], "readwrite");
			const store = transaction.objectStore(STORE_NAMES.GEAR);
			const request = store.put(gear);

			request.onsuccess = () => resolve();
			request.onerror = () => reject(request.error);
		});
	},
};
