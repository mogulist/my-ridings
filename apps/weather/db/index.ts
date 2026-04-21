import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

type Db = PostgresJsDatabase<typeof schema>;

let _client: ReturnType<typeof postgres> | undefined;
let _db: Db | undefined;

const getDb = (): Db => {
	if (_db) return _db;
	const connectionString = process.env.DATABASE_URL;
	if (!connectionString) {
		throw new Error("DATABASE_URL is not set");
	}
	_client = postgres(connectionString, { prepare: false, max: 5 });
	_db = drizzle(_client, { schema });
	return _db;
};

/** 첫 쿼리 시 연결. 빌드 타임에는 환경변수 없어도 모듈 로드만으로는 throw 하지 않음. */
export const db = new Proxy({} as Db, {
	get(_target, prop, receiver) {
		const d = getDb();
		const v = Reflect.get(d, prop, receiver);
		if (typeof v === "function") return v.bind(d);
		return v;
	},
});
