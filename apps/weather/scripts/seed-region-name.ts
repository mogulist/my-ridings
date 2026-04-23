/**
 * `격자_지역명_final.xlsx` (열: 격자 X, 격자 Y, 지역명) → weather_grid_meta.region_name
 *
 * 시드 전 `region_name`을 전부 NULL로 비운 뒤, 엑셀에 있는 (nx,ny)에만 `지역명`을 trim 한 값을 넣는다.
 * 엑셀에 없는 격자는 NULL. EXCEL_PATH 로 파일 경로 오버라이드.
 */
import XLSX from "xlsx";
import { sql } from "drizzle-orm";
import { db } from "../db";

const EXCEL_PATH = process.env.EXCEL_PATH ?? "/Users/lim/Downloads/격자_지역명_final.xlsx";
const BATCH = 500;

type Row = {
	nx: number;
	ny: number;
	regionName: string;
};

const main = async () => {
	await db.execute(
		sql`UPDATE weather.weather_grid_meta SET region_name = NULL`,
	);
	console.log("cleared region_name for all weather_grid_meta rows");

	const wb = XLSX.readFile(EXCEL_PATH);
	const ws = wb.Sheets[wb.SheetNames[0]!];
	const rawRows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1 }) as unknown[][];
	const dataRows = rawRows.slice(1);

	const seen = new Set<string>();
	const rows: Row[] = [];

	for (const row of dataRows) {
		const arr = row as unknown[];
		const nxRaw = arr[0];
		const nyRaw = arr[1];
		const nameRaw = arr[2];
		if (nxRaw === undefined || nxRaw === null || nyRaw === undefined || nyRaw === null) {
			continue;
		}
		const nx = Number(nxRaw);
		const ny = Number(nyRaw);
		if (!Number.isInteger(nx) || !Number.isInteger(ny)) {
			continue;
		}
		const regionName = String(nameRaw ?? "").trim();
		if (!regionName) {
			continue;
		}
		const key = `${nx},${ny}`;
		if (seen.has(key)) {
			console.warn(`duplicate (nx,ny) in Excel: ${key}, keeping first row only`);
			continue;
		}
		seen.add(key);
		rows.push({ nx, ny, regionName });
	}

	console.log(`총 ${rows.length}개 격자에 지역명 매핑 (엑셀 유효 행)`);

	let updated = 0;
	for (let i = 0; i < rows.length; i += BATCH) {
		const chunk = rows.slice(i, i + BATCH);
		const values = sql.join(
			chunk.map((r) => sql`(${r.nx}, ${r.ny}, ${r.regionName})`),
			sql`, `,
		);
		await db.execute(sql`
			UPDATE weather.weather_grid_meta AS m SET
				region_name = v.name
			FROM (VALUES ${values}) AS v(nx, ny, name)
			WHERE m.nx = v.nx::integer AND m.ny = v.ny::integer
		`);
		updated += chunk.length;
		console.log(`업데이트 ${updated} / ${rows.length}`);
	}

	console.log("done region names");
	process.exit(0);
};

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
