import { gridToLatLng } from "@my-ridings/weather-grid";
import { sql } from "drizzle-orm";
import { db } from "../db";
import { nearestMidRegionCodes } from "../lib/mid-region-centroids";

const BATCH = 400;

const main = async () => {
	const rows: { nx: number; ny: number; land: string; temp: string }[] = [];
	for (let nx = 1; nx <= 149; nx += 1) {
		for (let ny = 1; ny <= 253; ny += 1) {
			const { lat, lng } = gridToLatLng(nx, ny);
			const { land, temp } = nearestMidRegionCodes(lat, lng);
			rows.push({ nx, ny, land, temp });
		}
	}
	for (let i = 0; i < rows.length; i += BATCH) {
		const chunk = rows.slice(i, i + BATCH);
		const values = sql.join(
			chunk.map((r) => sql`(${r.nx}, ${r.ny}, ${r.land}, ${r.temp})`),
			sql`, `,
		);
		await db.execute(sql`
			UPDATE weather.weather_grid_meta AS m SET
				mid_region_land = v.land::text,
				mid_region_temp = v.temp::text
			FROM (VALUES ${values}) AS v(nx, ny, land, temp)
			WHERE m.nx = v.nx::integer AND m.ny = v.ny::integer
		`);
		console.log(`mid regions ${Math.min(i + BATCH, rows.length)} / ${rows.length}`);
	}
	console.log("done mid regions");
	process.exit(0);
};

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
