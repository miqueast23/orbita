import { NextResponse, type NextRequest } from "next/server";
import { getUser } from "@/lib/auth";
import { sql } from "@/lib/db";

export async function GET(req: NextRequest) {
  const u = await getUser();
  if (!u) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 80);
  if (q.length < 2) return NextResponse.json([]);
  const like = `%${q.replace(/[\\%_]/g, (c) => "\\" + c)}%`;

  const [spaces, posts, lessons, members] = await Promise.all([
    sql`select slug, emoji, name, kind from spaces where kind <> 'link' and name ilike ${like} order by group_pos, position limit 4`,
    sql`select p.id, p.title, s.slug, s.name from posts p join spaces s on s.id = p.space_id
        where p.title ilike ${like} or p.body ilike ${like} order by p.created_at desc limit 6`,
    sql`select l.id, l.title, c.slug from lessons l join sections se on se.id = l.section_id join courses c on c.id = se.course_id
        where l.title ilike ${like} and not c.locked order by se.position, l.position limit 4`,
    sql`select id, name, industry from users where name ilike ${like} order by name limit 4`,
  ]);

  return NextResponse.json([
    ...spaces.map((s) => ({ kind: "space", title: `${s.emoji} ${s.name}`, sub: "Espacio", href: s.kind === "course" ? `/courses/${s.slug}` : `/c/${s.slug}` })),
    ...posts.map((p) => ({ kind: "post", title: p.title, sub: `Post en ${p.name}`, href: `/c/${p.slug}/${p.id}` })),
    ...lessons.map((l) => ({ kind: "lesson", title: l.title, sub: "Lección del curso", href: `/courses/${l.slug}/${l.id}` })),
    ...members.map((m) => ({ kind: "member", title: m.name, sub: m.industry ?? "Miembro", href: `/u/${m.id}` })),
  ]);
}
