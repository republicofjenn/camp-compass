import { readFileSync, readdirSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { config } from "dotenv";
import postgres from "postgres";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
config({ path: join(root, ".env.local") });

const policiesDir = join(root, "src/db/policies");
const files = readdirSync(policiesDir).filter((f) => f.endsWith(".sql")).sort();

const sql = postgres(process.env.DATABASE_URL);

try {
  for (const file of files) {
    console.log(`Applying ${file}...`);
    const policySql = readFileSync(join(policiesDir, file), "utf-8");
    await sql.unsafe(policySql);
  }
  console.log("RLS policies applied successfully.");
} catch (err) {
  console.error("Failed to apply RLS policies:", err.message);
  process.exitCode = 1;
} finally {
  await sql.end();
}
