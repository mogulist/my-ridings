import { createServer } from "node:http";
import { readFileSync } from "node:fs";
const origin = "http://127.0.0.1:4319";
const adminUser = {
  id: "fixture-admin", email: "admin@example.test", aud: "authenticated", role: "authenticated",
  app_metadata: {}, user_metadata: {}, created_at: "2026-01-01T00:00:00Z",
};
const adminAccessToken = `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({
  sub: adminUser.id, exp: 4102444800, role: "authenticated",
})).toString("base64url")}.fixture-signature`;
const records = JSON.parse(
  readFileSync(
    new URL("../../tests/fixtures/stats-record-files/hongcheon_2025.json", import.meta.url),
  ),
);
const course = {
  id: "course-1",
  course_type: "granfondo",
  name: "그란폰도",
  name_en: "Gran Fondo",
  distance: 120,
  elevation: 2000,
  registered_count: 5,
  has_kom: true,
  gpx_blob_url: `${origin}/course.gpx`,
  official_site_url: "https://example.com",
  strava_url: null,
  ride_with_gps_url: null,
};
const edition = {
  id: "edition-1",
  year: 2025,
  date: "2025-04-20",
  status: "completed",
  courses: [course],
  records_blob_url: `${origin}/records.json`,
  sorted_records_blob_url: `${origin}/sorted.json`,
  kom_records_blob_url: `${origin}/records.json`,
  kom_sorted_records_blob_url: `${origin}/kom-sorted.json`,
  notice: "공지",
  notice_en: "Event notice",
  comment: null,
  comment_en: null,
};
const event = {
  id: "event-1",
  slug: "hongcheon",
  name: "홍천 그란폰도",
  name_en: "Hongcheon Gran Fondo",
  location: "홍천",
  location_en: "Hongcheon",
  comment: null,
  comment_en: null,
  color_from: "#000000",
  color_to: "#000000",
  meta_title: "홍천 그란폰도 통계 | K-Fondo",
  meta_description: "홍천 대회 기록",
  meta_image: "",
  event_editions: [
    edition,
    {
      ...edition,
      id: "edition-2",
      year: 2026,
      date: "2026-10-20",
      status: "upcoming",
      courses: [{ ...course, edition_id: "edition-2" }],
      records_blob_url: null,
      sorted_records_blob_url: null,
    },
  ],
};
let cacheProbeVersion = 1;
createServer(async (req, res) => {
  const url = new URL(req.url, origin);
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "application/json");
  if (url.pathname === "/__fixture/cache-probe" && req.method === "POST") {
    cacheProbeVersion++;
    return res.end(JSON.stringify({ version: cacheProbeVersion }));
  }
  if (url.pathname === "/auth/v1/token") {
    let body = "";
    for await (const chunk of req) body += chunk;
    if (JSON.parse(body || "{}").refresh_token !== "fixture-refresh-token") {
      res.statusCode = 400;
      return res.end(JSON.stringify({ error_code: "refresh_token_not_found", msg: "Invalid token" }));
    }
    return res.end(JSON.stringify({
      access_token: adminAccessToken, refresh_token: "fixture-refresh-token", token_type: "bearer",
      expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, user: adminUser,
    }));
  }
  if (url.pathname === "/auth/v1/user") {
    if (req.headers.authorization === "Bearer fixture-nonadmin-token") {
      return res.end(JSON.stringify({ ...adminUser, id: "fixture-viewer", email: "viewer@example.test" }));
    }
    if (req.headers.authorization !== `Bearer ${adminAccessToken}`) {
      res.statusCode = 401;
      return res.end(JSON.stringify({ msg: "Invalid token" }));
    }
    return res.end(JSON.stringify(adminUser));
  }
  if (url.pathname === "/rest/v1/admin_whitelist") {
    return res.end(JSON.stringify(url.searchParams.get("email") === `eq.${adminUser.email}`
      ? { id: adminUser.id } : null));
  }
  if (url.pathname === "/rest/v1/events") {
    const slug = url.searchParams.get("slug");
    if (slug === "eq.buyeo") {
      return res.end(JSON.stringify({ ...event, slug: "buyeo", name: "부여 굿뜨래 그란폰도", name_en: "Buyeo Goodtrae Gran Fondo",
        event_editions: [{ ...edition, year: 2026, date: "2026-10-31", records_blob_url: null, sorted_records_blob_url: null,
          kom_records_blob_url: `${origin}/kom-only-records.json`, kom_sorted_records_blob_url: `${origin}/kom-only-sorted.json`,
          comment: "공식 공개 자료는 KOM 구간 기록만 제공합니다.", comment_en: "Only KOM segment records are officially available." }],
      }));
    }
    if (slug === "eq.cache-probe") {
      return res.end(JSON.stringify({ ...event, slug: "cache-probe",
        name: `캐시 확인 ${cacheProbeVersion}`, name_en: `Cache probe ${cacheProbeVersion}` }));
    }
    if (slug && slug !== "eq.hongcheon") {
      res.statusCode = 406;
      return res.end(JSON.stringify({ code: "PGRST116", message: "Not found" }));
    }
    return res.end(JSON.stringify(slug ? event : [event]));
  }
  if (url.pathname === "/kom-only-records.json") return res.end(JSON.stringify([
    { BIB_NO: "1", Event: "그란폰도(kom)", Gender: "남", Time: "00:05:00", Status: "FINISH" },
    { BIB_NO: "2", Event: "그란폰도(kom)", Gender: "여", Time: "00:06:00", Status: "FINISH" },
  ]));
  if (url.pathname === "/kom-only-sorted.json") return res.end(JSON.stringify({
    "그란폰도(kom)": [300000, 360000], "그란폰도(kom)_M": [300000], "그란폰도(kom)_F": [360000],
  }));
  if (url.pathname === "/records.json") return res.end(JSON.stringify(records));
  if (url.pathname === "/sorted.json")
    return res.end(
      JSON.stringify({
        그란폰도: [12600000, 17100000, 19800000],
        그란폰도_M: [12600000, 19800000],
        그란폰도_F: [17100000],
      }),
    );
  if (url.pathname === "/kom-sorted.json")
    return res.end(JSON.stringify({ "그란폰도(kom)": [12600000, 17100000, 19800000] }));
  if (url.pathname === "/course.gpx") {
    res.setHeader("Content-Type", "application/gpx+xml");
    return res.end(
      '<gpx><trk><trkseg><trkpt lat="37.1" lon="127.1"><ele>100</ele></trkpt><trkpt lat="37.11" lon="127.11"><ele>150</ele></trkpt><trkpt lat="37.12" lon="127.12"><ele>120</ele></trkpt></trkseg></trk></gpx>',
    );
  }
  if (url.pathname.startsWith("/auth/")) return res.end(JSON.stringify({ user: null }));
  if (url.pathname.startsWith("/rest/v1/")) return res.end("[]");
  res.statusCode = 404;
  res.end("{}");
}).listen(4319, "127.0.0.1", () => console.log("K-Fondo fixture server ready"));
