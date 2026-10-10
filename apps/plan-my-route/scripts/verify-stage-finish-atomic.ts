import type { StageFinishInput } from "../lib/stage-finish-input";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
// Install @electric-sql/pglite@0.5.8 in a temporary directory; pass its dist/index.js path.
const modulePath = process.env.PGLITE_MODULE_PATH;
if (!modulePath)
	throw new Error("PGLITE_MODULE_PATH is required; see the PR validation instructions.");
const { PGlite } = await import(modulePath);
const db = new PGlite();
const plan = "11111111-1111-4111-8111-111111111111";
const owner = "22222222-2222-4222-8222-222222222222";
const current = "33333333-3333-4333-8333-333333333333";
const next = "44444444-4444-4444-8444-444444444444";
const poi = "55555555-5555-4555-8555-555555555555";
const requestId = "66666666-6666-4666-8666-666666666666";
const input:StageFinishInput = {
	requestId,
	currentStageId: current,
	nextStageId: next,
	newEndM: 8000,
	expectedCurrentStartM: 0,
	expectedCurrentEndM: 10000,
	expectedNextStartM: 10000,
	expectedNextEndM: 20000,
	currentGainM: 80,
	currentLossM: 10,
	nextGainM: 120,
	nextLossM: 20,
	poiIds: [poi],
};
const finish = (body = input, who = owner, key = requestId) =>
	db.query("select finish_plan_stage_atomic($1,$2,$3,$4::jsonb) as result", [
		plan,
		who,
		key,
		JSON.stringify(body),
	]);
const values = async () =>
	(await db.query("select start_distance,end_distance from stage order by start_distance")).rows;
try {
	await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
 CREATE TABLE route(id uuid primary key,user_id uuid);
 CREATE TABLE plan(id uuid primary key,route_id uuid references route(id));
 CREATE TABLE stage(id uuid primary key,plan_id uuid references plan(id),start_distance numeric,end_distance numeric,elevation_gain numeric,elevation_loss numeric,start_name text,end_name text,updated_at timestamptz);
 CREATE TABLE plan_poi(id uuid primary key,plan_id uuid references plan(id),stage_id uuid references stage(id),assignment_mode text,updated_at timestamptz);`);
	await db.exec(
		await readFile(
			new URL("../supabase-migration-stage-finish-atomic.sql", import.meta.url),
			"utf8",
		),
	);
	const seed = async () => {
		await db.exec("truncate stage_finish_request,plan_poi,stage,plan,route cascade");
		await db.query("insert into route values($1,$2)", [plan, owner]);
		await db.query("insert into plan values($1,$1)", [plan]);
		await db.query(
			"insert into stage(id,plan_id,start_distance,end_distance,start_name,end_name) values($1,$3,0,10000,'출발','원래 종료'),($2,$3,10000,20000,'원래 시작','도착')",
			[current, next, plan],
		);
		await db.query(
			"insert into plan_poi(id,plan_id,stage_id,assignment_mode) values($1,$2,$3,'stage')",
			[poi, plan, current],
		);
	};
	await seed();
	await finish();
	assert.deepEqual(await values(), [
		{ start_distance: "0", end_distance: "8000" },
		{ start_distance: "8000", end_distance: "20000" },
	]);
	assert.equal((await db.query("select stage_id from plan_poi")).rows[0].stage_id, next);
	assert.equal(
		(await db.query("select end_name from stage where id=$1", [current])).rows[0].end_name,
		null,
	);
	await finish();
	assert.equal(
		(await db.query("select count(*)::int as n from stage_finish_request")).rows[0].n,
		1,
	);
	await assert.rejects(() => finish({ ...input, newEndM: 7000 }));
	console.log(
		"PASS: atomic boundaries/POI, cleared stale labels, idempotent retry and changed request rejection",
	);
	await seed();
	await assert.rejects(() => finish(input, next));
	await assert.rejects(() => finish({ ...input, expectedNextStartM: 11000 }));
	await assert.rejects(() => finish({ ...input, poiIds: [next] }));
	assert.deepEqual(await values(), [
		{ start_distance: "0", end_distance: "10000" },
		{ start_distance: "10000", end_distance: "20000" },
	]);
	console.log("PASS: ownership, stale boundary and stale POI reject without changes");
	await db.exec(
		"create function fixture_fail_poi() returns trigger language plpgsql as $$begin raise exception 'fixture failure';end$$; create trigger fixture_fail before update on plan_poi for each row execute function fixture_fail_poi();",
	);
	await assert.rejects(() => finish());
	assert.deepEqual(await values(), [
		{ start_distance: "0", end_distance: "10000" },
		{ start_distance: "10000", end_distance: "20000" },
	]);
	assert.equal((await db.query("select stage_id from plan_poi")).rows[0].stage_id, current);
	assert.equal(
		(await db.query("select count(*)::int as n from stage_finish_request")).rows[0].n,
		0,
	);
	await db.exec("drop trigger fixture_fail on plan_poi;drop function fixture_fail_poi();");
	await finish();
	console.log(
		"PASS: failure after both stage updates rolls back stages/POI/request; retry succeeds",
	);
    await seed();await finish({...input,currentGainM:null,currentLossM:null,nextGainM:null,nextLossM:null});
    assert.equal((await db.query("select elevation_gain from stage where id=$1",[current])).rows[0].elevation_gain,null);
    console.log("PASS: unknown altitude is preserved as NULL instead of zero ascent");
	await db.exec("set role authenticated");
	await assert.rejects(() => finish());
	await db.exec("reset role");
	console.log("PASS: authenticated role cannot execute the privileged server RPC");
} finally {
	await db.close();
}
