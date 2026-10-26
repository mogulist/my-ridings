const assert = require("node:assert/strict");
const { createRequire } = require("node:module");
const test = require("node:test");

const routerRequire = createRequire(require.resolve("expo-router/package.json"));
const queryString = routerRequire("query-string");

test("Expo Router keeps Unicode and repeated query parameters with the patched decoder", () => {
  const params = { q: "홍천 + 서울", stage: ["1", "2"], scope: "kom" };
  const parsed = queryString.parse(queryString.stringify(params));
  assert.equal(parsed.q, params.q);
  assert.deepEqual(parsed.stage, params.stage);
  assert.equal(parsed.scope, params.scope);
});

test("Expo Router tolerates malformed percent-encoded query values", () => {
  const parsed = queryString.parse("q=%E0%A4%A&scope=kom");
  assert.equal(typeof parsed.q, "string");
  assert.equal(parsed.scope, "kom");
});

test("Expo Xcode tooling keeps CommonJS UUID generation with uuid 11", () => {
  const expoRequire = createRequire(require.resolve("@expo/config-plugins/package.json"));
  const project = expoRequire("xcode").project("unused.pbxproj");
  project.hash = { project: { objects: {} } };
  const ids = Array.from({ length: 10 }, () => project.generateUuid());
  assert.equal(new Set(ids).size, ids.length);
  for (const id of ids) assert.match(id, /^[A-F0-9]{24}$/);
});
