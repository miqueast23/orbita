// Aplica db/schema.sql y, si la base está vacía, db/seed.sql.
// Uso: node --env-file=.env.local scripts/migrate.mjs
import { readFileSync } from "node:fs";
import { Pool } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!url) throw new Error("Falta DATABASE_URL");

const pool = new Pool({ connectionString: url });
const file = (name) => readFileSync(new URL(`../db/${name}`, import.meta.url), "utf8");

try {
  await pool.query(file("schema.sql"));
  console.log("schema ok");
  const { rows } = await pool.query("select count(*)::int as n from spaces");
  if (rows[0].n === 0) {
    await pool.query("begin");
    await pool.query(file("seed.sql"));
    await pool.query("commit");
    console.log("seed ok");
  } else {
    console.log(`seed omitido (${rows[0].n} espacios ya cargados)`);
  }
} catch (err) {
  await pool.query("rollback").catch(() => {});
  console.error(err);
  process.exitCode = 1;
} finally {
  await pool.end();
}
