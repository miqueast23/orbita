// Rota las contraseñas de las cuentas listadas en credenciales-NO-SUBIR.txt (fuera del repo).
// Genera claves nuevas, actualiza password_hash en la base y reescribe el archivo. No imprime claves.
// Uso: node --env-file=.env.local scripts/rotar-claves.mjs
import { neon } from "@neondatabase/serverless";
import { randomBytes, scrypt as scryptCb } from "node:crypto";
import { promisify } from "node:util";
import fs from "node:fs";
import path from "node:path";

const scrypt = promisify(scryptCb);
const sql = neon(process.env.DATABASE_URL);
const archivo = path.resolve(import.meta.dirname, "../../credenciales-NO-SUBIR.txt");

const lineas = fs.readFileSync(archivo, "utf8").split(/\r?\n/);
const salida = [];
for (const l of lineas) {
  const m = l.match(/^(admin|moderator|member)\s+(\S+@\S+)\s+\S+$/);
  if (!m) { salida.push(l); continue; }
  const clave = randomBytes(12).toString("base64url");
  const salt = randomBytes(16);
  const hash = `${salt.toString("hex")}:${(await scrypt(clave, salt, 64)).toString("hex")}`;
  const r = await sql`update users set password_hash = ${hash} where email = ${m[2]} returning id`;
  if (r.length !== 1) throw new Error(`No existe la cuenta ${m[2]}`);
  salida.push(`${m[1].padEnd(9)} ${m[2]}  ${clave}`);
  console.log("rotada:", m[2]);
}
salida.push(`# Claves rotadas ${new Date().toISOString().slice(0, 10)} (las anteriores quedaron expuestas en un registro de herramientas).`);
fs.writeFileSync(archivo, salida.join("\n"));
