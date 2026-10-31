# Órbita · app

Comunidad, cursos y encuentros. Next.js 16 (App Router) + Postgres en Neon, desplegada en Vercel.

- Producción: https://orbita-kappa-one.vercel.app (proyecto Vercel `actualizatemts-projects/orbita`)
- Base de datos: Neon `orbita-db` (integración de Vercel). `DATABASE_URL` y `AUTH_SECRET` viven en Vercel; local en `.env.local` (`vercel env pull`).

## Comandos

```bash
npm run dev                                         # local
node --env-file=.env.local scripts/migrate.mjs      # aplica db/schema.sql (+ db/seed.sql si la base está vacía)
npm run build && vercel deploy --prod               # publicar
```

Ojo: local y producción usan la MISMA base. Lo que se pruebe en local queda en vivo.

## Pruebas

```bash
npx next start -p 3050
BASE=http://localhost:3050 OUT=<carpeta> PW_HEADLESS=true node ~/.claude/skills/playwright-skill/run.js playwright-tests/flujo-principal.js
```

Crea usuarios `*@test.orbita`; bórralos después:
`delete from users where email like '%@test.orbita';`

## Admins

El registro siempre crea miembros. Para dar admin:
`update users set role = 'admin' where email = '<correo>';`

## Qué falta (fuera del MVP)

Pagos (Stripe), video real (Bunny Stream: poner `lessons.video_url`), recuperar contraseña y verificación de correo (Resend), panel de admin, 2FA, borrar cuenta, revocar sesiones, límite de mensajes directos, recordatorios de eventos y mejoras V1-V3 del documento `02-Proyecto-Orbita`.
