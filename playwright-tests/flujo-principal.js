// Flujo principal de Órbita: registro, feed, like, comentario, guardado, post, anónimo,
// curso, RSVP, leaderboard, búsqueda, mensaje, tema y móvil.
// Uso: BASE=http://localhost:3050 OUT=<carpeta capturas> node <playwright-skill>/run.js playwright-tests/flujo-principal.js
// Crea un usuario de prueba qa+<fecha>@test.orbita: bórralo después (ver README).
const { chromium } = require("playwright");
const path = require("path");

const BASE = process.env.BASE || "http://localhost:3050";
const OUT = process.env.OUT || ".";
const email = `qa+${Date.now()}@test.orbita`;
const errors = [];
const results = [];
const check = (name, ok) => { results.push(`${ok ? "OK " : "FALLA"} ${name}`); if (!ok) process.exitCode = 1; };
const shot = (page, name) => page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: false });

(async () => {
  const browser = await chromium.launch({ headless: process.env.PW_HEADLESS !== "false" });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push(String(e)));

  // Registro
  await page.goto(`${BASE}/registro`);
  await page.fill('input[name="name"]', "QA Prueba");
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', "clave-de-prueba-123");
  await page.click("button.btn");
  await page.waitForURL("**/feed");
  check("registro lleva al feed", page.url().endsWith("/feed"));
  const nPosts = await page.locator("article.post").count();
  check(`feed muestra posts (${nPosts})`, nPosts >= 10);
  await shot(page, "01-feed-escritorio");

  // Like + guardado en el primer post
  const first = page.locator("article.post").first();
  const likesBefore = await first.locator(".stats span").first().textContent();
  await first.locator(".bar button").first().click();
  await page.waitForTimeout(1200);
  const likesAfter = await first.locator(".stats span").first().textContent();
  check(`like cambia contador (${likesBefore} -> ${likesAfter})`, likesBefore !== likesAfter);
  await first.locator('button[aria-label="Guardar post"]').click();
  await page.waitForTimeout(1000);

  // Comentario
  await first.locator(".bar button").nth(1).click();
  await first.locator(".cform input").fill("Comentario de prueba automática");
  await first.locator(".cform button").click();
  await page.waitForTimeout(1500);
  check("comentario aparece", (await page.getByText("Comentario de prueba automática").count()) > 0);

  // Guardados
  await page.goto(`${BASE}/bookmarks`);
  check("guardados tiene el post", (await page.locator("article.post").count()) === 1);

  // Crear post en Hablemos
  await page.goto(`${BASE}/c/hablemos`);
  await page.getByRole("button", { name: "New post" }).click();
  await page.fill('input[name="title"]', "Post QA automático");
  await page.fill('textarea[name="body"]', "Cuerpo del post de prueba.");
  await page.getByRole("button", { name: "Publicar" }).click();
  await page.waitForURL(/\/c\/hablemos\/\d+/);
  check("post creado abre su detalle", (await page.getByRole("heading", { name: "Post QA automático" }).count()) === 1);
  await shot(page, "02-post-detalle");

  // Espacio solo-equipo: un miembro no ve el botón
  await page.goto(`${BASE}/c/avisos`);
  check("avisos sin botón New post para miembros", (await page.getByRole("button", { name: "New post" }).count()) === 0);

  // Pregunta anónima
  await page.goto(`${BASE}/c/anonima`);
  await page.getByRole("button", { name: "Preguntar en anónimo" }).click();
  await page.fill('input[name="title"]', "Pregunta anónima QA");
  await page.fill('textarea[name="body"]', "¿Esto oculta mi nombre?");
  await page.getByRole("button", { name: "Publicar" }).click();
  await page.waitForURL(/\/c\/anonima\/\d+/);
  check("autor ve su post anónimo marcado", (await page.getByText("QA Prueba (anónimo)").count()) === 1);

  // Curso: continuar y completar lección
  await page.goto(`${BASE}/courses`);
  await shot(page, "03-cursos");
  await page.goto(`${BASE}/courses/curso-15`);
  await page.getByRole("link", { name: "Continuar" }).click();
  await page.waitForURL(/\/courses\/curso-15\/\d+/);
  await page.getByRole("button", { name: "Marcar como completada" }).click();
  await page.getByRole("button", { name: "✓ Completada" }).waitFor({ timeout: 8000 });
  check("lección marcada como completada", true);
  await shot(page, "04-leccion");

  // Curso bloqueado
  await page.goto(`${BASE}/c/curso-ia`);
  check("curso bloqueado muestra candado", (await page.getByText("no está incluido en tu plan").count()) === 1);

  // RSVP
  await page.goto(`${BASE}/c/encuentros`);
  await page.getByRole("button", { name: "Confirmar asistencia" }).first().click();
  await page.getByRole("button", { name: "✓ Asistiré" }).first().waitFor({ timeout: 8000 });
  check("RSVP confirmado", true);

  // Leaderboard: 2 posts (4) + comentario (1) + lección (1) = 6
  await page.goto(`${BASE}/leaderboard?periodo=all`);
  const meLine = await page.locator(".card .muted").first().textContent();
  check(`leaderboard suma puntos (${meLine})`, /^6 puntos/.test(meLine.trim()));
  await shot(page, "05-leaderboard");

  // Búsqueda
  await page.goto(`${BASE}/feed`);
  await page.click('button[aria-label="Buscar"]');
  await page.fill('input[aria-label="Buscar"]', "retención");
  await page.waitForTimeout(1500);
  check("búsqueda devuelve resultados", (await page.locator(".modal .prow").count()) > 0);
  await shot(page, "06-busqueda");
  await page.keyboard.press("Escape");

  // Mensaje a Ana
  await page.goto(`${BASE}/members?q=Ana`);
  await page.locator(".prow").first().click();
  await page.getByRole("link", { name: "Enviar mensaje" }).click();
  await page.fill('input[aria-label="Escribe un mensaje"]', "Hola Ana, mensaje de prueba");
  await page.getByRole("button", { name: "Enviar" }).click();
  await page.waitForTimeout(1500);
  check("mensaje enviado aparece", (await page.getByText("Hola Ana, mensaje de prueba").count()) === 1);

  // Tema oscuro
  await page.goto(`${BASE}/feed`);
  await page.click('button[aria-label="Menú de usuario"]');
  await page.getByRole("button", { name: "Cambiar tema claro u oscuro" }).click();
  await shot(page, "07-tema");

  // Móvil 390
  const m = await browser.newContext({ viewport: { width: 390, height: 844 }, storageState: await ctx.storageState() });
  const mp = await m.newPage();
  mp.on("pageerror", (e) => errors.push(String(e)));
  await mp.goto(`${BASE}/feed`);
  await shot(mp, "08-movil-feed");
  await mp.click('button[aria-label="Abrir menú"]');
  await mp.waitForTimeout(400);
  check("cajón lateral abre en móvil", await mp.locator("aside.side.open").isVisible());
  await shot(mp, "09-movil-menu");
  const overflow = await mp.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  check("sin scroll horizontal en móvil", !overflow);

  // Cerrar sesión
  await page.click('button[aria-label="Menú de usuario"]').catch(() => {});
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await page.waitForURL("**/login");
  check("cerrar sesión vuelve a login", page.url().endsWith("/login"));

  console.log(results.join("\n"));
  console.log(`errores de consola: ${errors.length}`);
  errors.slice(0, 10).forEach((e) => console.log("  - " + e.slice(0, 200)));
  console.log(`usuario de prueba: ${email}`);
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
