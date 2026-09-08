import { describe, expect, test } from "bun:test";
import {
	createSupabaseAuthAdapter,
	toAccountInsertRow,
	toUserInsertRow,
} from "./supabase-auth-adapter";

describe("toUserInsertRow", () => {
	test("GitHub 숫자 id는 uuid 컬럼에 넣지 않는다", () => {
		const row = toUserInsertRow({
			id: "12345678",
			name: "Herbert",
			email: "user@example.com",
			image: "https://avatars.githubusercontent.com/u/1",
			emailVerified: null,
		});

		expect(row).not.toHaveProperty("id");
		expect(row).toEqual({
			name: "Herbert",
			email: "user@example.com",
			image: "https://avatars.githubusercontent.com/u/1",
			emailVerified: null,
		});
	});

	test("이미 UUID인 id는 그대로 유지한다", () => {
		const id = "550e8400-e29b-41d4-a716-446655440000";
		const row = toUserInsertRow({
			id,
			name: "Herbert",
			email: "user@example.com",
			image: null,
			emailVerified: new Date("2026-01-01T00:00:00.000Z"),
		});

		expect(row.id).toBe(id);
		expect(row.emailVerified).toBe("2026-01-01T00:00:00.000Z");
	});
});

describe("toAccountInsertRow", () => {
	test("GitHub 토큰 응답의 알 수 없는 컬럼은 제거한다", () => {
		const row = toAccountInsertRow({
			type: "oauth",
			provider: "github",
			providerAccountId: "12345678",
			userId: "550e8400-e29b-41d4-a716-446655440000",
			access_token: "gho_xxx",
			token_type: "bearer",
			scope: "read:user,user:email",
			refresh_token_expires_in: 15897600,
			expires_in: 28800,
		});

		expect(row).toEqual({
			type: "oauth",
			provider: "github",
			providerAccountId: "12345678",
			userId: "550e8400-e29b-41d4-a716-446655440000",
			access_token: "gho_xxx",
			token_type: "bearer",
			scope: "read:user,user:email",
		});
		expect(row).not.toHaveProperty("refresh_token_expires_in");
		expect(row).not.toHaveProperty("expires_in");
	});
});

describe("createSupabaseAuthAdapter", () => {
	test("getUserByAccount는 users(*) 임베드 없이 accounts 후 users를 조회한다", async () => {
		const user = {
			id: "550e8400-e29b-41d4-a716-446655440000",
			name: "Herbert",
			email: "user@example.com",
			image: null,
			emailVerified: null,
		};
		const selects: string[] = [];
		const tables: string[] = [];
		const client = createRecordingClient({
			accounts: [{ provider: "github", providerAccountId: "12345678", userId: user.id }],
			users: [user],
			selects,
			tables,
		});

		const adapter = createSupabaseAuthAdapter(client);
		const found = await adapter.getUserByAccount?.({
			provider: "github",
			providerAccountId: "12345678",
		});

		expect(found).toMatchObject({
			id: user.id,
			name: user.name,
			email: user.email,
		});
		expect(tables).toEqual(["accounts", "users"]);
		expect(selects.some((sql) => sql.includes("users ("))).toBe(false);
	});

	test("getSessionAndUser는 sessions(*) 임베드 없이 sessions 후 users를 조회한다", async () => {
		const user = {
			id: "550e8400-e29b-41d4-a716-446655440000",
			name: "Herbert",
			email: "user@example.com",
			image: null,
			emailVerified: null,
		};
		const selects: string[] = [];
		const tables: string[] = [];
		const client = createRecordingClient({
			accounts: [],
			users: [user],
			sessions: [
				{
					id: "sess-id",
					sessionToken: "sess-token",
					userId: user.id,
					expires: "2026-12-01T00:00:00.000Z",
				},
			],
			selects,
			tables,
		});

		const adapter = createSupabaseAuthAdapter(client);
		const found = await adapter.getSessionAndUser?.("sess-token");

		expect(found?.user).toMatchObject({
			id: user.id,
			email: user.email,
		});
		expect(tables).toEqual(["sessions", "users"]);
		expect(selects.some((sql) => sql.includes("users ("))).toBe(false);
	});
});

type MockRow = Record<string, unknown>;

const createRecordingClient = ({
	accounts,
	users,
	sessions = [],
	selects,
	tables,
}: {
	accounts: MockRow[];
	users: MockRow[];
	sessions?: MockRow[];
	selects: string[];
	tables: string[];
}) => {
	const data: Record<string, MockRow[]> = { accounts, users, sessions };

	const from = (table: string) => {
		tables.push(table);
		const rows = data[table] ?? [];
		const filters: Array<(row: MockRow) => boolean> = [];
		let selectSql = "*";

		const builder = {
			select: (sql = "*") => {
				selectSql = sql;
				selects.push(sql);
				return builder;
			},
			eq: (column: string, value: unknown) => {
				filters.push((row) => row[column] === value);
				return builder;
			},
			maybeSingle: async () => {
				if (selectSql.includes("users (")) {
					return {
						data: null,
						error: {
							message: "Could not find a relationship between accounts and users",
						},
					};
				}
				const found = rows.filter((row) => filters.every((match) => match(row)));
				return { data: found[0] ?? null, error: null };
			},
		};

		return builder;
	};

	return {
		schema: () => ({ from }),
	};
};
