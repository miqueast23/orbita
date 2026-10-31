import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createHmac, randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { sql } from "./db";

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;
const COOKIE = "orbita_session";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 días

function secret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) throw new Error("AUTH_SECRET falta o es muy corto (mínimo 32 caracteres)");
  return s;
}

export async function hashPassword(pw: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(pw, salt, 64);
  return `${salt.toString("hex")}:${key.toString("hex")}`;
}

export async function verifyPassword(pw: string, stored: string): Promise<boolean> {
  const [saltHex, keyHex] = stored.split(":");
  if (!saltHex || !keyHex) return false;
  const key = await scrypt(pw, Buffer.from(saltHex, "hex"), 64);
  const expected = Buffer.from(keyHex, "hex");
  return expected.length === key.length && timingSafeEqual(expected, key);
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export async function startSession(userId: string) {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE;
  const payload = `${userId}.${exp}`;
  (await cookies()).set(COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function endSession() {
  (await cookies()).delete(COOKIE);
}

function readSession(raw: string | undefined): string | null {
  if (!raw) return null;
  const parts = raw.split(".");
  if (parts.length !== 3) return null;
  const [userId, exp, sig] = parts;
  const good = Buffer.from(sign(`${userId}.${exp}`));
  const got = Buffer.from(sig);
  if (good.length !== got.length || !timingSafeEqual(good, got)) return null;
  if (Number(exp) < Date.now() / 1000) return null;
  return userId;
}

export type User = {
  id: string;
  email: string;
  name: string;
  initials: string;
  color: string;
  role: "admin" | "moderator" | "member";
  bio: string | null;
  industry: string | null;
};

export const getUser = cache(async (): Promise<User | null> => {
  const userId = readSession((await cookies()).get(COOKIE)?.value);
  if (!userId) return null;
  const rows = await sql`select id, email, name, initials, color, role, bio, industry from users where id = ${userId}`;
  return (rows[0] as User) ?? null;
});

export async function requireUser(): Promise<User> {
  const u = await getUser();
  if (!u) redirect("/login");
  return u;
}

export const isStaff = (u: User) => u.role === "admin" || u.role === "moderator";

export function initialsOf(name: string): string {
  const w = name.trim().split(/\s+/).filter(Boolean);
  return ((w[0]?.[0] ?? "?") + (w.length > 1 ? w[w.length - 1][0] : "")).toUpperCase();
}

const PALETTE = ["#2b59c3", "#16794c", "#a8650f", "#7a3fb8", "#c2410c", "#0e7490", "#be185d"];
export const colorFor = (email: string) => PALETTE[[...email].reduce((a, c) => a + c.charCodeAt(0), 0) % PALETTE.length];
