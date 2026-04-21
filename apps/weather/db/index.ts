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

/**
 * 첫 쿼리 시 지연 연결. 빌드 타임엔 환경변수 없어도 모듈 로드만으로는 throw 하지 않음.
 *
 * 주의: `.transaction()` 등 고차 API는 Proxy 내부의 this 바인딩 문제가 발생할 수 있다.
 * 트랜잭션이 필요한 경우 `getDb()`를 직접 호출해서 사용할 것.
 */
export const db = new Proxy({} as Db, {
	get(_target, prop, receiver) {
		const d = getDb();
		const v = Reflect.get(d, prop, receiver);
		if (typeof v === "function") return v.bind(d);
		return v;
	},
});
