"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { sql } from "@/lib/db";
import {
  colorFor, endSession, hashPassword, initialsOf, isStaff, requireUser, startSession, verifyPassword,
} from "@/lib/auth";
import { isUuid } from "@/lib/data";

export type FormState = { error?: string; ok?: string } | undefined;

const str = (f: FormData, k: string, max: number) => String(f.get(k) ?? "").trim().slice(0, max);
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// ids que llegan del cliente: entero positivo de 32 bits
const okId = (n: unknown): n is number => Number.isInteger(n) && (n as number) > 0 && (n as number) <= 2147483647;

/* ---------- Autenticación ---------- */

const TOO_MANY = "Demasiados intentos. Espera unos minutos y vuelve a probar.";
// Hash ficticio: el login tarda lo mismo exista o no el correo (evita enumerar cuentas por tiempo).
const DUMMY_HASH = "00000000000000000000000000000000:" + "0".repeat(128);

async function clientIp() {
  return ((await headers()).get("x-forwarded-for") ?? "").split(",")[0].trim().slice(0, 64) || "desconocida";
}
const logAuth = (kind: string, email: string | null, ip: string) =>
  sql`insert into auth_events (kind, email, ip) values (${kind}, ${email}, ${ip})`;

export async function register(_: FormState, f: FormData): Promise<FormState> {
  const name = str(f, "name", 80);
  const email = str(f, "email", 200).toLowerCase();
  const password = String(f.get("password") ?? "");
  if (name.length < 2) return { error: "Escribe tu nombre." };
  if (!EMAIL.test(email)) return { error: "Correo no válido." };
  if (password.length < 8 || password.length > 200) return { error: "La contraseña debe tener al menos 8 caracteres." };

  // ponytail: límite en Postgres; pasar a Upstash/Vercel Firewall si llega tráfico real de bots
  const ip = await clientIp();
  const recent = await sql`select count(*)::int as n from auth_events
    where kind in ('register','register_fail') and ip = ${ip} and created_at > now() - interval '1 hour'`;
  if (recent[0].n >= 5) return { error: TOO_MANY };

  // El rol siempre es member: los admins se asignan a mano en la base (sin verificación de correo no hay otra vía segura).
  const hash = await hashPassword(password);
  const rows = await sql`insert into users (email, password_hash, name, initials, color, role)
    values (${email}, ${hash}, ${name}, ${initialsOf(name)}, ${colorFor(email)}, 'member')
    on conflict (email) do nothing returning id`;
  if (!rows[0]) {
    await logAuth("register_fail", email, ip);
    return { error: "No se pudo crear la cuenta con ese correo. Si ya tienes una, entra con tu contraseña." };
  }
  await logAuth("register", email, ip);
  await startSession(rows[0].id);
  redirect("/feed");
}

export async function login(_: FormState, f: FormData): Promise<FormState> {
  const email = str(f, "email", 200).toLowerCase();
  const password = String(f.get("password") ?? "").slice(0, 200);
  const ip = await clientIp();
  const fails = await sql`select
      count(*) filter (where email = ${email})::int as by_email,
      count(*) filter (where ip = ${ip})::int as by_ip
    from auth_events where kind = 'login_fail' and created_at > now() - interval '15 minutes'
      and (email = ${email} or ip = ${ip})`;
  if (fails[0].by_email >= 5 || fails[0].by_ip >= 20) return { error: TOO_MANY };

  const rows = await sql`select id, password_hash from users where email = ${email}`;
  const ok = await verifyPassword(password, rows[0]?.password_hash ?? DUMMY_HASH);
  if (!ok || !rows[0]?.password_hash) {
    await logAuth("login_fail", email, ip);
    return { error: "Correo o contraseña incorrectos." };
  }
  await logAuth("login_ok", email, ip);
  await startSession(rows[0].id);
  redirect("/feed");
}

export async function logout() {
  await endSession();
  redirect("/login");
}

/* ---------- Posts ---------- */

export async function createPost(_: FormState, f: FormData): Promise<FormState> {
  const u = await requireUser();
  const title = str(f, "title", 140);
  const body = str(f, "body", 10000);
  const slug = str(f, "space", 60);
  if (!title || !body) return { error: "El post necesita título y texto." };
  const s = (await sql`select id, kind, admin_only_post from spaces where slug = ${slug}`)[0];
  if (!s || !["posts", "anon"].includes(s.kind)) return { error: "Ese espacio no admite posts." };
  if (s.admin_only_post && !isStaff(u)) return { error: "En este espacio solo publica el equipo." };
  const p = (await sql`insert into posts (space_id, author_id, title, body, anonymous)
    values (${s.id}, ${u.id}, ${title}, ${body}, ${s.kind === "anon"}) returning id`)[0];
  await sql`insert into points_ledger (user_id, action, ref, points) values (${u.id}, 'post', ${"post:" + p.id}, 2) on conflict do nothing`;
  redirect(`/c/${slug}/${p.id}?nuevo=1`);
}

async function postOwner(postId: number) {
  const r = await sql`select p.author_id, p.title, s.slug from posts p join spaces s on s.id = p.space_id where p.id = ${postId}`;
  return r[0] as { author_id: string; title: string; slug: string } | undefined;
}

export async function toggleLike(postId: number) {
  if (!okId(postId)) return;
  const u = await requireUser();
  const p = await postOwner(postId);
  if (!p) return;
  const removed = await sql`delete from likes where user_id = ${u.id} and post_id = ${postId} returning post_id`;
  const ref = `like:${postId}:${u.id}`;
  if (removed[0]) {
    await sql`delete from points_ledger where ref = ${ref}`;
  } else {
    // solo puntúa y notifica si el like se insertó de verdad (evita carreras en paralelo)
    const added = await sql`insert into likes (user_id, post_id) values (${u.id}, ${postId}) on conflict do nothing returning post_id`;
    if (added[0] && p.author_id !== u.id) {
      await sql`insert into points_ledger (user_id, action, ref, points) values (${p.author_id}, 'like_recibido', ${ref}, 1) on conflict do nothing`;
      await sql`insert into notifications (user_id, text, href, ref)
        values (${p.author_id}, ${`${u.name} le dio like a tu post "${p.title.slice(0, 60)}"`}, ${`/c/${p.slug}/${postId}`}, ${ref})
        on conflict do nothing`;
    }
  }
  refresh();
}

export async function addComment(postId: number, text: string): Promise<FormState> {
  if (!okId(postId)) return { error: "Este post ya no existe." };
  const u = await requireUser();
  const body = String(text ?? "").trim().slice(0, 2000);
  if (!body) return { error: "Escribe un comentario." };
  const p = await postOwner(postId);
  if (!p) return { error: "Este post ya no existe." };
  await sql`insert into comments (post_id, author_id, body) values (${postId}, ${u.id}, ${body})`;
  if (p.author_id !== u.id) {
    // como mucho 1 punto por post comentado, y nunca en posts propios
    await sql`insert into points_ledger (user_id, action, ref, points)
      values (${u.id}, 'comentario', ${`comment:${postId}:${u.id}`}, 1) on conflict do nothing`;
    await sql`insert into notifications (user_id, text, href)
      values (${p.author_id}, ${`${u.name} comentó tu post "${p.title.slice(0, 60)}"`}, ${`/c/${p.slug}/${postId}`})`;
  }
  refresh();
  return { ok: "Comentario publicado" };
}

export async function toggleBookmark(postId: number) {
  if (!okId(postId)) return;
  const u = await requireUser();
  const del = await sql`delete from bookmarks where user_id = ${u.id} and post_id = ${postId} returning post_id`;
  if (!del[0]) await sql`insert into bookmarks (user_id, post_id) select ${u.id}, id from posts where id = ${postId} on conflict do nothing`;
  refresh();
  return !del[0];
}

export async function deletePost(postId: number): Promise<FormState> {
  if (!okId(postId)) return { error: "Este post ya no existe." };
  const u = await requireUser();
  const p = await postOwner(postId);
  if (!p) return { error: "Este post ya no existe." };
  if (p.author_id !== u.id && !isStaff(u)) return { error: "No puedes eliminar este post." };
  await sql`delete from points_ledger where ref = ${"post:" + postId}
    or ref like ${"like:" + postId + ":%"} or ref like ${"comment:" + postId + ":%"}`;
  await sql`delete from notifications where ref like ${"like:" + postId + ":%"}`;
  await sql`delete from posts where id = ${postId}`;
  refresh();
  return { ok: "Post eliminado" };
}

export async function reportPost(postId: number) {
  if (!okId(postId)) return;
  const u = await requireUser();
  await sql`insert into reports (post_id, user_id) select id, ${u.id} from posts where id = ${postId} on conflict do nothing`;
}

/* ---------- Eventos y cursos ---------- */

export async function toggleRsvp(eventId: number) {
  if (!okId(eventId)) return;
  const u = await requireUser();
  const del = await sql`delete from rsvps where event_id = ${eventId} and user_id = ${u.id} returning event_id`;
  if (!del[0]) await sql`insert into rsvps (event_id, user_id) select id, ${u.id} from events where id = ${eventId} on conflict do nothing`;
  refresh();
  return !del[0];
}

export async function toggleLesson(lessonId: number) {
  if (!okId(lessonId)) return;
  const u = await requireUser();
  const ref = `lesson:${lessonId}:${u.id}`;
  const del = await sql`delete from progress where user_id = ${u.id} and lesson_id = ${lessonId} returning lesson_id`;
  if (del[0]) {
    await sql`delete from points_ledger where ref = ${ref}`;
  } else {
    const ins = await sql`insert into progress (user_id, lesson_id)
      select ${u.id}, l.id from lessons l join sections s on s.id = l.section_id join courses c on c.id = s.course_id
      where l.id = ${lessonId} and not c.locked
      on conflict do nothing returning lesson_id`;
    if (ins[0]) await sql`insert into points_ledger (user_id, action, ref, points) values (${u.id}, 'leccion', ${ref}, 1) on conflict do nothing`;
  }
  refresh();
  return !del[0];
}

/* ---------- Notificaciones y mensajes ---------- */

export async function readNotification(id: number) {
  if (!okId(id)) return;
  const u = await requireUser();
  await sql`update notifications set read = true where id = ${id} and user_id = ${u.id}`;
}

export async function readAllNotifications() {
  const u = await requireUser();
  await sql`update notifications set read = true where user_id = ${u.id} and not read`;
  refresh();
}

export async function sendMessage(to: string, text: string): Promise<FormState> {
  const u = await requireUser();
  const body = String(text ?? "").trim().slice(0, 4000);
  if (!body) return { error: "Escribe un mensaje." };
  if (!isUuid(to) || to === u.id) return { error: "Destinatario no válido." };
  const r = await sql`insert into messages (sender_id, recipient_id, body) select ${u.id}, id, ${body} from users where id = ${to} returning id`;
  if (!r[0]) return { error: "Destinatario no válido." };
  refresh();
  return { ok: "Enviado" };
}

/* ---------- Perfil ---------- */

export async function updateProfile(_: FormState, f: FormData): Promise<FormState> {
  const u = await requireUser();
  const name = str(f, "name", 80);
  const bio = str(f, "bio", 500) || null;
  const industry = str(f, "industry", 80) || null;
  if (name.length < 2) return { error: "Escribe tu nombre." };
  await sql`update users set name = ${name}, initials = ${initialsOf(name)}, bio = ${bio}, industry = ${industry} where id = ${u.id}`;
  refresh();
  return { ok: "Perfil actualizado" };
}
