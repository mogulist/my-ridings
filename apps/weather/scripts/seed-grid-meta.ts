import { gridToLatLng } from "@my-ridings/weather-grid";
import { db } from "../db";
import { weatherGridMeta } from "../db/schema";

const BATCH = 400;

const main = async () => {
	const rows: {
		nx: number;
		ny: number;
		lat: string;
		lng: string;
		midRegionLand: null;
		midRegionTemp: null;
	}[] = [];
	for (let nx = 1; nx <= 149; nx += 1) {
		for (let ny = 1; ny <= 253; ny += 1) {
			const { lat, lng } = gridToLatLng(nx, ny);
			rows.push({
				nx,
				ny,
				lat: lat.toFixed(6),
				lng: lng.toFixed(6),
				midRegionLand: null,
				midRegionTemp: null,
			});
		}
	}
	for (let i = 0; i < rows.length; i += BATCH) {
		const chunk = rows.slice(i, i + BATCH);
		await db
			.insert(weatherGridMeta)
			.values(chunk)
			.onConflictDoNothing({ target: [weatherGridMeta.nx, weatherGridMeta.ny] });
		console.log(`seeded ${Math.min(i + BATCH, rows.length)} / ${rows.length}`);
	}
	console.log("done");
	process.exit(0);
};

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
