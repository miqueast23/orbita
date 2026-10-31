import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { fmtDate, getMember, getPoints, levelFor } from "@/lib/data";

export default async function Profile(props: PageProps<"/u/[user]">) {
  const me = await requireUser();
  const m = await getMember((await props.params).user);
  if (!m) notFound();
  const [points, posts] = await Promise.all([
    getPoints(m.id, "all"),
    sql`select p.id, p.title, p.created_at, s.slug, s.name from posts p join spaces s on s.id = p.space_id
        where p.author_id = ${m.id} and not p.anonymous order by p.created_at desc limit 10`,
  ]);
  const L = levelFor(points);
  const isMe = m.id === me.id;
  const since = new Date(m.created_at).toLocaleDateString("es-VE", { month: "long", year: "numeric" });

  return (
    <>
      <div className="card" style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
        <Avatar p={m} size={64} style={{ fontSize: 20 }} />
        <div style={{ flex: 1, minWidth: 200 }}>
          <h1 style={{ fontSize: 22 }}>{m.name}{m.role === "admin" && <span className="role">Admin</span>}</h1>
          <div className="muted">{m.industry ?? "Miembro"} · Nivel {L.name} · {points} puntos · Desde {since}</div>
        </div>
        {isMe ? <Link className="btn ghost" href="/settings">Editar perfil</Link> : <Link className="btn" href={`/messages/${m.id}`}>Enviar mensaje</Link>}
      </div>
      {m.bio && <div className="card" style={{ whiteSpace: "pre-line" }}>{m.bio}</div>}
      <div className="card">
        <h2 style={{ fontSize: 15, marginBottom: 8 }}>Actividad reciente</h2>
        {posts.length === 0 && <p className="muted" style={{ margin: 0 }}>Todavía no ha publicado.</p>}
        {posts.map((p) => (
          <Link key={p.id} className="trend" href={`/c/${p.slug}/${p.id}`}>
            <span><span className="t">{p.title}</span><br /><span className="a">{p.name} · {fmtDate(p.created_at)}</span></span>
          </Link>
        ))}
      </div>
    </>
  );
}
