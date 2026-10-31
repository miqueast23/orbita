// Prueba por roles: admin, moderador y miembros. Corre contra producción con cuentas de prueba.
// Credenciales por variables de entorno (nunca en este archivo):
//   ADMIN_EMAIL/ADMIN_PASS, MOD_EMAIL/MOD_PASS, MEM_EMAIL/MEM_PASS
// Crea contenido marcado "QA-ROL" y un usuario *@test.orbita: limpiar después (ver README).
const { chromium } = require("playwright");
const path = require("path");

const BASE = process.env.BASE || "https://orbita-kappa-one.vercel.app";
const OUT = process.env.OUT || ".";
const results = [];
const errors = [];
const check = (n, ok) => { results.push(`${ok ? "OK " : "FALLA"} ${n}`); if (!ok) process.exitCode = 1; };

async function session(browser, email, pass) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  page.on("dialog", (d) => d.accept());
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await page.goto(`${BASE}/login`);
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', pass);
  await page.click("button.btn");
  await page.waitForURL("**/feed", { timeout: 15000 });
  return page;
}

async function createPost(page, space, title, body, button = "New post") {
  await page.goto(`${BASE}/c/${space}`);
  await page.getByRole("button", { name: button }).click();
  await page.fill('input[name="title"]', title);
  await page.fill('textarea[name="body"]', body);
  await page.getByRole("button", { name: "Publicar" }).click();
  await page.waitForURL(new RegExp(`/c/${space}/\\d+`));
  return page.url();
}

(async () => {
  const env = process.env;
  const browser = await chromium.launch({ headless: env.PW_HEADLESS !== "false" });

  // Admin
  const admin = await session(browser, env.ADMIN_EMAIL, env.ADMIN_PASS);
  check("admin entra", admin.url().endsWith("/feed"));
  const avisoUrl = await createPost(admin, "avisos", "Aviso QA-ROL", "Aviso de prueba del equipo.");
  check("admin publica en Avisos (solo equipo)", /\/c\/avisos\/\d+/.test(avisoUrl));
  await admin.goto(`${BASE}/members?q=Oscar`);
  check("admin con insignia Admin en Miembros", (await admin.locator(".prow .role", { hasText: "Admin" }).count()) >= 1);

  // Miembro: pregunta anónima y comentario en su propio hilo
  const mem = await session(browser, env.MEM_EMAIL, env.MEM_PASS);
  check("miembro no ve New post en Avisos", await (async () => { await mem.goto(`${BASE}/c/avisos`); return (await mem.getByRole("button", { name: "New post" }).count()) === 0; })());
  const anonUrl = await createPost(mem, "anonima", "Pregunta QA-ROL", "¿Se oculta mi nombre?", "Preguntar en anónimo");
  await mem.locator(".cform input").fill("Comentario del autor QA-ROL");
  await mem.locator(".cform button").click();
  await mem.getByText("Comentario del autor QA-ROL").waitFor({ timeout: 10000 });

  // Otro miembro (recién registrado) no debe ver el nombre del autor anónimo
  const ctx3 = await browser.newContext();
  const other = await ctx3.newPage();
  other.on("pageerror", (e) => errors.push(String(e)));
  await other.goto(`${BASE}/registro`);
  await other.fill('input[name="name"]', "Observador QA");
  await other.fill('input[name="email"]', `observador+${Date.now()}@test.orbita`);
  await other.fill('input[name="password"]', "clave-observador-123");
  await other.click("button.btn");
  await other.waitForURL("**/feed");
  await other.goto(anonUrl);
  const html = await other.content();
  check("otro miembro ve 'Miembro anónimo'", html.includes("Miembro anónimo"));
  check("otro miembro ve el comentario como 'Autor (anónimo)'", html.includes("Autor (anónimo)"));
  check("otro miembro NO ve el nombre real", !html.includes("Carla Méndez"));
  check("otro miembro no puede eliminar el post", await (async () => {
    await other.click('button[aria-label="Acciones del post"]');
    return (await other.getByRole("button", { name: "Eliminar post" }).count()) === 0;
  })());

  // Cambio de contraseña del observador y nuevo login
  await other.goto(`${BASE}/settings`);
  await other.fill('input[name="current"]', "clave-observador-123");
  await other.fill('input[name="next"]', "clave-observador-456");
  await other.getByRole("button", { name: "Cambiar contraseña" }).click();
  await other.getByText("Contraseña actualizada").waitFor({ timeout: 10000 });
  check("cambio de contraseña", true);

  // Moderador: ve el autor real y elimina el post anónimo
  const mod = await session(browser, env.MOD_EMAIL, env.MOD_PASS);
  await mod.goto(anonUrl);
  check("moderador ve el autor real del anónimo", (await mod.getByText("Carla Méndez (anónimo)").count()) >= 1);
  await mod.click('button[aria-label="Acciones del post"]');
  await mod.getByRole("button", { name: "Eliminar post" }).click();
  await mod.waitForURL(/\/c\/anonima$/, { timeout: 15000 });
  check("moderador elimina post de otro", true);
  await mod.screenshot({ path: path.join(OUT, "roles-moderador.png") });

  // Admin elimina su aviso
  await admin.goto(avisoUrl);
  await admin.click('button[aria-label="Acciones del post"]');
  await admin.getByRole("button", { name: "Eliminar post" }).click();
  await admin.waitForURL(/\/c\/avisos$/, { timeout: 15000 });
  check("admin elimina su aviso", true);

  // Límite de intentos de login (correo inexistente, no bloquea cuentas reales)
  const brute = await (await browser.newContext()).newPage();
  let last = "";
  for (let i = 0; i < 6; i++) {
    await brute.goto(`${BASE}/login`);
    await brute.fill('input[name="email"]', "fuerza-bruta@test.orbita");
    await brute.fill('input[name="password"]', "incorrecta" + i);
    await brute.click("button.btn");
    last = await brute.locator(".err").textContent({ timeout: 10000 });
  }
  check(`login bloquea tras 5 fallos ("${last}")`, last.includes("Demasiados intentos"));

  console.log(results.join("\n"));
  console.log(`errores de consola: ${errors.length}`);
  errors.slice(0, 8).forEach((e) => console.log("  - " + e.slice(0, 200)));
  await browser.close();
})().catch((e) => { console.error(results.join("\n")); console.error(e); process.exit(1); });
