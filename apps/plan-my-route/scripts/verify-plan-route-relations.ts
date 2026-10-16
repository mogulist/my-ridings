/** Read-only PostgREST regression check against a DB with route.selected_plan_id.
 * Run: bun --env-file=.env.local scripts/verify-plan-route-relations.ts
 * Extracts the actual app queries, including nested ownership checks, and asks
 * PostgREST to resolve them with limit=0; no riding data is read or changed.
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import ts from "typescript";

const origin = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!origin || !key) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
const root = path.resolve(import.meta.dir, "..");
async function files(dir: string): Promise<string[]> {
	const entries = await readdir(dir, { withFileTypes: true });
	return (await Promise.all(entries.map((entry) => {
		const name = path.join(dir, entry.name);
		return entry.isDirectory() ? files(name) : Promise.resolve(/\.tsx?$/.test(name) ? [name] : []);
	}))).flat();
}
function fromTable(node: ts.Node): string | null {
	if (ts.isCallExpression(node)) {
		if (ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === "from") {
			const arg = node.arguments[0];
			return arg && ts.isStringLiteralLike(arg) ? arg.text : null;
		}
		return fromTable(node.expression);
	}
	return ts.isPropertyAccessExpression(node) ? fromTable(node.expression) : null;
}
const queries: { file: string; table: string; select: string }[] = [];
for (const file of await files(path.join(root, "app"))) {
	const source = ts.createSourceFile(file, await readFile(file, "utf8"), ts.ScriptTarget.Latest, true);
	function visit(node: ts.Node) {
		if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)
			&& node.expression.name.text === "select") {
			const arg = node.arguments[0];
			if (arg && ts.isStringLiteralLike(arg)
				&& /\b(?:route(?::route)?|plans?:plan)(?:!|\s*\()/.test(arg.text)) {
				const table = fromTable(node.expression.expression);
				if (!table) throw new Error(`Cannot determine source table: ${file}`);
				queries.push({ file: path.relative(root, file), table, select: arg.text });
			}
		}
		ts.forEachChild(node, visit);
	}
	visit(source);
}
if (!queries.length) throw new Error("No relationship queries found");
let failed = false;
for (const query of queries) {
	const url = new URL(`/rest/v1/${query.table}`, origin);
	url.searchParams.set("select", query.select);
	url.searchParams.set("limit", "0");
	const response = await fetch(url, {
		headers: { apikey: key, Authorization: `Bearer ${key}` },
		signal: AbortSignal.timeout(15000),
	});
	const body = await response.json();
	const passed = response.ok && Array.isArray(body) && body.length === 0;
	console.log(JSON.stringify({ file: query.file, table: query.table, passed, status: response.status,
		...(!passed ? { errorCode: body?.code ?? "unknown" } : {}) }));
	failed ||= !passed;
}
console.log(JSON.stringify({ checkedQueries: queries.length, passed: !failed }));
if (failed) process.exitCode = 1;
