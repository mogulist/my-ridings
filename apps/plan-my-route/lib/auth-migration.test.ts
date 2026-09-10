import { describe, expect, test } from "bun:test";

const forwardMigrationPath = new URL("../supabase-migration-auth-users.sql", import.meta.url);
const rollbackMigrationPath = new URL(
	"../supabase-migration-auth-users-rollback.sql",
	import.meta.url,
);

describe("Supabase Auth 사용자 마이그레이션", () => {
	test("GitHub provider ID로 사용자를 매핑한다", async () => {
		const sql = await Bun.file(forwardMigrationPath).text();

		expect(sql).toContain("JOIN auth.identities");
		expect(sql).toContain('ai.provider_id = na_acc."providerAccountId"');
		expect(sql).not.toContain("lower(au.email) = lower(na.email)");
	});

	test("역방향 마이그레이션을 제공한다", async () => {
		const sql = await Bun.file(rollbackMigrationPath).text();

		expect(sql).toContain("REFERENCES next_auth.users (id)");
		expect(sql).toContain("JOIN auth.identities");
	});
});
