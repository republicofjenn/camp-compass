import { readFileSync, readdirSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { config } from "dotenv";
import postgres from "postgres";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
config({ path: join(root, ".env.local") });

const sqlDir = join(root, "src/db/sql");
const files = readdirSync(sqlDir).filter((f) => f.endsWith(".sql")).sort();

const sql = postgres(process.env.DATABASE_URL);

try {
  await sql`
    create table if not exists _sql_migrations (
      filename text primary key,
      applied_at timestamptz not null default now()
    )
  `;

  const appliedRows = await sql`select filename from _sql_migrations`;
  const applied = new Set(appliedRows.map((r) => r.filename));

  let ranAny = false;
  for (const file of files) {
    if (applied.has(file)) {
      console.log(`Skipping ${file} (already applied)`);
      continue;
    }
    console.log(`Applying ${file}...`);
    const fileSql = readFileSync(join(sqlDir, file), "utf-8");
    await sql.unsafe(fileSql);
    await sql`insert into _sql_migrations (filename) values (${file})`;
    ranAny = true;
  }

  console.log(ranAny ? "SQL files applied successfully." : "Nothing new to apply.");
} catch (err) {
  console.error("Failed to apply SQL files:", err.message);
  process.exitCode = 1;
} finally {
  await sql.end();
}
