import Link from "next/link";
import { Avatar } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { sql } from "@/lib/db";

export const metadata = { title: "Miembros" };

export default async function Members(props: PageProps<"/members">) {
  await requireUser();
  const q = String((await props.searchParams).q ?? "").trim().slice(0, 80);
  const like = `%${q.replace(/[\\%_]/g, (c) => "\\" + c)}%`;
  const rows = (await sql`select id, name, initials, color, role, industry from users
    where ${q} = '' or name ilike ${like} or industry ilike ${like} order by name limit 100`) as Array<{ id: string; name: string; initials: string; color: string; role: string; industry: string | null }>;
  return (
    <>
      <div className="ph"><h1>Miembros</h1></div>
      <form className="card" style={{ display: "flex", gap: 8 }} role="search">
        <input name="q" defaultValue={q} placeholder="Busca por nombre o industria" aria-label="Buscar miembros"
          style={{ flex: 1, minWidth: 0, border: "1px solid var(--line)", background: "var(--surface)", borderRadius: 8, padding: "8px 12px" }} />
        <button className="btn">Buscar</button>
      </form>
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {rows.length === 0 && <p className="empty">Sin resultados.</p>}
        {rows.map((m) => (
          <Link key={m.id} className="prow" href={`/u/${m.id}`} style={{ alignItems: "center" }}>
            <Avatar p={m} />
            <span className="tx"><b>{m.name}</b>{m.role === "admin" && <span className="role">Admin</span>}<br /><span className="tm">{m.industry ?? "Miembro"}</span></span>
          </Link>
        ))}
      </div>
    </>
  );
}
