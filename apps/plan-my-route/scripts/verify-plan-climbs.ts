import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const modulePath = process.env.PGLITE_MODULE_PATH;
if (!modulePath)
	throw new Error("Pass @electric-sql/pglite@0.5.8 dist/index.js as PGLITE_MODULE_PATH.");
const { PGlite } = await import(modulePath);
const db = new PGlite();
const plan = "11111111-1111-4111-8111-111111111111",
	summit = "22222222-2222-4222-8222-222222222222";
try {
	await db.exec(
		"create role anon;create role authenticated;create role service_role bypassrls;create function uuid_generate_v4() returns uuid language sql as $$select gen_random_uuid()$$;create table plan(id uuid primary key);create table summit_catalog(id uuid primary key,name text);",
	);
	await db.exec(
		await readFile(new URL("../supabase-migration-plan-climbs.sql", import.meta.url), "utf8"),
	);
	await db.query("insert into plan values($1)", [plan]);
	await db.query("insert into summit_catalog values($1,$2)", [summit, "공식 고개"]);
	await db.exec("set role service_role");
	const upsert = () =>
		db.query(
			"insert into plan_climb_marker(plan_id,summit_id,name,distance_m) values($1,$2,'내 고개',10000) on conflict(plan_id,distance_m) do update set name=excluded.name,summit_id=excluded.summit_id returning id",
			[plan, summit],
		);
	const first = (await upsert()).rows[0].id;
	assert.equal((await upsert()).rows[0].id, first);
	assert.equal((await db.query("select count(*)::int as n from plan_climb_marker")).rows[0].n, 1);
	await assert.rejects(() =>
		db.query("insert into plan_climb_marker(plan_id,name,distance_m) values($1,'',20000)", [plan]),
	);
	await assert.rejects(() =>
		db.query("insert into plan_climb_marker(plan_id,name,distance_m) values($1,'고개',-1)", [plan]),
	);
	await db.exec("reset role");
	assert.equal((await db.query("select name from summit_catalog")).rows[0].name, "공식 고개");
	await db.query("delete from summit_catalog where id=$1", [summit]);
	assert.equal((await db.query("select summit_id from plan_climb_marker")).rows[0].summit_id, null);
	for (const role of ["anon", "authenticated"]) {
		await db.exec(`set role ${role}`);
		await assert.rejects(() => db.query("select * from plan_climb_marker"));
		await db.exec("reset role");
	}
	console.log(
		"PASS: real migration, service-role registration/retry, constraints, catalog preservation, deleted-link fallback, denied public/authenticated access",
	);
} finally {
	await db.close();
}
