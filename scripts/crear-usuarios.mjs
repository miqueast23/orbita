// Crea la cuenta admin y las cuentas de prueba con claves aleatorias.
// Las claves se escriben SOLO en ../credenciales-NO-SUBIR.txt (fuera del repo y del hosting); nunca por consola.
// Uso: node --env-file=.env.local scripts/crear-usuarios.mjs "<correo admin>" "<nombre admin>"
import { randomBytes, scryptSync } from "node:crypto";
import { appendFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";

const [adminEmail, adminName] = process.argv.slice(2);
if (!adminEmail || !adminName) throw new Error("Uso: crear-usuarios.mjs <correo admin> <nombre admin>");

const sql = neon(process.env.DATABASE_URL);
const OUT = new URL("../../credenciales-NO-SUBIR.txt", import.meta.url);

const hash = (pw) => {
  const salt = randomBytes(16);
  return `${salt.toString("hex")}:${scryptSync(pw, salt, 64).toString("hex")}`;
};
const initials = (n) => { const w = n.trim().split(/\s+/); return ((w[0][0] ?? "?") + (w.length > 1 ? w.at(-1)[0] : "")).toUpperCase(); };

const people = [
  { email: adminEmail.toLowerCase(), name: adminName, role: "admin", color: "#2b59c3", industry: "Dirección de Órbita" },
  { email: "moderador@prueba.orbita", name: "Diego Salas", role: "moderator", color: "#be185d", industry: "Moderación" },
  { email: "miembro@prueba.orbita", name: "Carla Méndez", role: "member", color: "#0e7490", industry: "Producto digital" },
];

const lines = [`\n# Órbita · cuentas creadas ${new Date().toISOString().slice(0, 10)} (https://orbita-kappa-one.vercel.app)`];
for (const p of people) {
  const pw = randomBytes(12).toString("base64url");
  const r = await sql`insert into users (email, password_hash, name, initials, color, role, industry)
    values (${p.email}, ${hash(pw)}, ${p.name}, ${initials(p.name)}, ${p.color}, ${p.role}, ${p.industry})
    on conflict (email) do update set role = excluded.role returning (xmax = 0) as created`;
  if (r[0].created) lines.push(`${p.role.padEnd(9)} ${p.email}  ${pw}`);
  console.log(`${p.role}: ${p.email} ${r[0].created ? "creada" : "ya existía (solo se ajustó el rol)"}`);
}
if (lines.length > 1) appendFileSync(OUT, lines.join("\n") + "\n", "utf8");
console.log("claves en credenciales-NO-SUBIR.txt (carpeta orbita-paquete)");
