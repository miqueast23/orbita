import "server-only";
import { sql } from "./db";
import { isStaff, type User } from "./auth";

export type Space = {
  id: number; slug: string; group_name: string; group_pos: number; position: number;
  emoji: string; name: string; kind: "posts" | "anon" | "course" | "locked" | "events" | "link";
  admin_only_post: boolean; url: string | null; unread: number;
};

export type Person = { id: string | null; name: string; initials: string; color: string; role: string | null };
export type CommentView = { id: number; body: string; created_at: string; author: Person };
export type PostView = {
  id: number; title: string; body: string; created_at: string; video_duration: string | null;
  space_slug: string; space_name: string; anonymous: boolean; author: Person;
  likes: number; liked: boolean; saved: boolean; mine: boolean; comments: CommentView[];
};

const ANON: Person = { id: null, name: "Miembro anónimo", initials: "?", color: "#6b6f76", role: null };

export async function getSpaces(userId: string): Promise<Space[]> {
  const rows = await sql`
    select s.*, (
      select count(*)::int from posts p
      where p.space_id = s.id and p.author_id <> ${userId}
        and p.created_at > coalesce(r.read_at, now() - interval '30 days')
    ) as unread
    from spaces s left join space_reads r on r.space_id = s.id and r.user_id = ${userId}
    order by s.group_pos, s.position`;
  return rows as Space[];
}

export async function markSpaceRead(userId: string, spaceId: number) {
  await sql`insert into space_reads (user_id, space_id, read_at) values (${userId}, ${spaceId}, now())
            on conflict (user_id, space_id) do update set read_at = now()`;
}

type PostFilter = { spaceId?: number; postId?: number; bookmarked?: boolean; sort?: "latest" | "popular"; limit?: number };

export async function getPosts(viewer: User, f: PostFilter = {}): Promise<PostView[]> {
  const spaceId = f.spaceId ?? null;
  const postId = f.postId ?? null;
  const bookmarked = !!f.bookmarked;
  const popular = f.sort === "popular";
  const limit = f.limit ?? 50;
  const rows = await sql`
    select p.id, p.title, p.body, p.created_at, p.video_duration, p.anonymous, p.author_id,
      s.slug as space_slug, s.name as space_name,
      u.name, u.initials, u.color, u.role,
      (select count(*)::int from likes l where l.post_id = p.id) as likes,
      exists(select 1 from likes l where l.post_id = p.id and l.user_id = ${viewer.id}) as liked,
      exists(select 1 from bookmarks b where b.post_id = p.id and b.user_id = ${viewer.id}) as saved,
      coalesce((select json_agg(json_build_object('id', c.id, 'body', c.body, 'created_at', c.created_at,
          'author_id', cu.id, 'name', cu.name, 'initials', cu.initials, 'color', cu.color, 'role', cu.role) order by c.created_at)
        from comments c join users cu on cu.id = c.author_id where c.post_id = p.id), '[]') as comments
    from posts p
    join spaces s on s.id = p.space_id
    join users u on u.id = p.author_id
    where (${spaceId}::int is null or p.space_id = ${spaceId})
      and (${postId}::int is null or p.id = ${postId})
      and (not ${bookmarked} or exists(select 1 from bookmarks b where b.post_id = p.id and b.user_id = ${viewer.id}))
    order by
      case when ${popular} then (select count(*) from likes l where l.post_id = p.id)
        + 2 * (select count(*) from comments c where c.post_id = p.id) end desc nulls last,
      p.created_at desc
    limit ${limit}`;

  const staff = isStaff(viewer);
  return rows.map((r) => {
    const mine = r.author_id === viewer.id;
    const real: Person = { id: r.author_id, name: r.name, initials: r.initials, color: r.color, role: r.role };
    const author = r.anonymous && !staff && !mine ? ANON : r.anonymous ? { ...real, name: `${real.name} (anónimo)` } : real;
    return {
      id: r.id, title: r.title, body: r.body, created_at: r.created_at, video_duration: r.video_duration,
      space_slug: r.space_slug, space_name: r.space_name, anonymous: r.anonymous, author,
      likes: r.likes, liked: r.liked, saved: r.saved, mine,
      comments: (r.comments as Array<Record<string, string>>).map((c) => {
        // el autor de una pregunta anónima sigue anónimo cuando comenta en su propio hilo
        const op = r.anonymous && c.author_id === r.author_id;
        const cAuthor: Person = { id: c.author_id, name: c.name, initials: c.initials, color: c.color, role: c.role };
        return {
          id: Number(c.id), body: c.body, created_at: c.created_at,
          author: op && !staff && !mine ? { ...ANON, name: "Autor (anónimo)" } : cAuthor,
        };
      }),
    } satisfies PostView;
  });
}

export async function getTrending() {
  return (await sql`
    select p.id, p.title, p.anonymous, u.name, u.initials, u.color, s.slug as space_slug
    from posts p join users u on u.id = p.author_id join spaces s on s.id = p.space_id
    order by (select count(*) from likes l where l.post_id = p.id) + 2 * (select count(*) from comments c where c.post_id = p.id) desc, p.created_at desc
    limit 5`) as Array<{ id: number; title: string; anonymous: boolean; name: string; initials: string; color: string; space_slug: string }>;
}

export type EventView = { id: number; title: string; kind: string; starts_at: string; going: number; rsvp: boolean };
export async function getEvents(userId: string, limit = 20): Promise<EventView[]> {
  return (await sql`
    select e.id, e.title, e.kind, e.starts_at,
      e.base_going + (select count(*)::int from rsvps r where r.event_id = e.id) as going,
      exists(select 1 from rsvps r where r.event_id = e.id and r.user_id = ${userId}) as rsvp
    from events e where e.starts_at > now() - interval '3 hours'
    order by e.starts_at limit ${limit}`) as EventView[];
}

export const LEVELS: [string, number][] = [["Bronce", 0], ["Plata", 10], ["Oro", 20], ["Platino", 40], ["Diamante", 80], ["Zafiro", 160], ["Rubí", 320], ["Titanio", 640], ["Black", 1280]];
export function levelFor(points: number) {
  let i = 0;
  LEVELS.forEach(([, min], j) => { if (points >= min) i = j; });
  return { name: LEVELS[i][0], next: LEVELS[i + 1] as [string, number] | undefined };
}

export type Period = "7" | "30" | "all";
const since = (p: Period) => (p === "all" ? null : p === "7" ? 7 : 30);

export async function getPoints(userId: string, period: Period = "all"): Promise<number> {
  const days = since(period);
  const rows = await sql`select coalesce(sum(points), 0)::int as n from points_ledger
    where user_id = ${userId} and (${days}::int is null or created_at > now() - make_interval(days => ${days}::int))`;
  return rows[0].n;
}

export async function getLeaderboard(period: Period) {
  const days = since(period);
  return (await sql`
    select u.id, u.name, u.initials, u.color, sum(pl.points)::int as points
    from points_ledger pl join users u on u.id = pl.user_id
    where (${days}::int is null or pl.created_at > now() - make_interval(days => ${days}::int))
    group by u.id having sum(pl.points) > 0
    order by points desc limit 20`) as Array<{ id: string; name: string; initials: string; color: string; points: number }>;
}

export type Lesson = { id: number; title: string; duration: string; video_url: string | null; done: boolean; section: string };
export type CourseView = {
  id: number; slug: string; title: string; emoji: string; locked: boolean; access_ends: string | null; space_slug: string | null;
  sections: { id: number; title: string; lessons: Lesson[] }[]; lessons: Lesson[]; done: number;
};

export async function getCourses(userId: string) {
  return (await sql`
    select c.slug, c.title, c.emoji, c.locked,
      (select count(*)::int from lessons l join sections s on s.id = l.section_id where s.course_id = c.id) as total,
      (select count(*)::int from progress pr join lessons l on l.id = pr.lesson_id join sections s on s.id = l.section_id
        where s.course_id = c.id and pr.user_id = ${userId}) as done
    from courses c order by c.locked, c.id`) as Array<{ slug: string; title: string; emoji: string; locked: boolean; total: number; done: number }>;
}

export async function getCourse(slug: string, userId: string): Promise<CourseView | null> {
  const cs = await sql`select c.*, s.slug as space_slug from courses c left join spaces s on s.id = c.space_id where c.slug = ${slug}`;
  if (!cs[0]) return null;
  const c = cs[0];
  const ls = await sql`
    select l.id, l.title, l.duration, l.video_url, s.id as section_id, s.title as section,
      exists(select 1 from progress p where p.lesson_id = l.id and p.user_id = ${userId}) as done
    from lessons l join sections s on s.id = l.section_id
    where s.course_id = ${c.id} order by s.position, l.position`;
  const sections: CourseView["sections"] = [];
  for (const l of ls) {
    let sec = sections.find((x) => x.id === l.section_id);
    if (!sec) sections.push((sec = { id: l.section_id, title: l.section, lessons: [] }));
    sec.lessons.push(l as Lesson);
  }
  const lessons = ls as Lesson[];
  return {
    id: c.id, slug: c.slug, title: c.title, emoji: c.emoji, locked: c.locked, access_ends: c.access_ends, space_slug: c.space_slug,
    sections, lessons, done: lessons.filter((l) => l.done).length,
  };
}

export async function getNotifications(userId: string, limit = 30) {
  return (await sql`select id, text, href, read, created_at from notifications where user_id = ${userId}
    order by created_at desc limit ${limit}`) as Array<{ id: number; text: string; href: string; read: boolean; created_at: string }>;
}

export async function getConversations(userId: string) {
  return (await sql`
    select distinct on (other) other, u.name, u.initials, u.color, m.body as last, m.created_at,
      exists(select 1 from messages x where x.sender_id = other and x.recipient_id = ${userId} and not x.read) as unread
    from (select *, case when sender_id = ${userId} then recipient_id else sender_id end as other
          from messages where sender_id = ${userId} or recipient_id = ${userId}) m
    join users u on u.id = m.other
    order by other, m.created_at desc`) as Array<{ other: string; name: string; initials: string; color: string; last: string; created_at: string; unread: boolean }>;
}

export async function getUnreadFlags(userId: string) {
  const r = await sql`select
    exists(select 1 from notifications where user_id = ${userId} and not read) as notif,
    exists(select 1 from messages where recipient_id = ${userId} and not read) as dm`;
  return r[0] as { notif: boolean; dm: boolean };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (s: string) => UUID.test(s);

export async function getMember(id: string) {
  if (!isUuid(id)) return null;
  const r = await sql`select id, name, initials, color, role, bio, industry, created_at from users where id = ${id}`;
  return (r[0] as { id: string; name: string; initials: string; color: string; role: string; bio: string | null; industry: string | null; created_at: string }) ?? null;
}

export function fmtDate(d: string | Date) {
  const dt = new Date(d);
  const diff = (Date.now() - dt.getTime()) / 36e5;
  if (diff < 1) return "ahora";
  if (diff < 24) return `hace ${Math.floor(diff)} h`;
  return dt.toLocaleDateString("es-VE", { month: "short", day: "numeric", timeZone: "America/Caracas" });
}
