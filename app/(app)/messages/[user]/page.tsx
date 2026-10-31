import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Avatar } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { fmtDate, getMember } from "@/lib/data";
import Reply from "./Reply";

export default async function Thread(props: PageProps<"/messages/[user]">) {
  const me = await requireUser();
  const other = await getMember((await props.params).user);
  if (!other) notFound();
  if (other.id === me.id) redirect("/messages");
  await sql`update messages set read = true where sender_id = ${other.id} and recipient_id = ${me.id} and not read`;
  const msgs = await sql`select id, sender_id, body, created_at from messages
    where (sender_id = ${me.id} and recipient_id = ${other.id}) or (sender_id = ${other.id} and recipient_id = ${me.id})
    order by created_at limit 300`;

  return (
    <>
      <div className="ph">
        <Link href={`/u/${other.id}`} style={{ display: "flex", gap: 10, alignItems: "center", textDecoration: "none" }}>
          <Avatar p={other} /><h1 style={{ fontSize: 20 }}>{other.name}</h1>
        </Link>
        <Link className="btn ghost" href="/messages">← Mensajes</Link>
      </div>
      <div className="card thread">
        {msgs.length === 0 && <p className="muted" style={{ margin: 0 }}>Escríbele el primer mensaje a {other.name}.</p>}
        {msgs.map((m) => (
          <div key={m.id} className={`msg ${m.sender_id === me.id ? "me" : ""}`}>{m.body}<small>{fmtDate(m.created_at)}</small></div>
        ))}
      </div>
      <Reply to={other.id} />
    </>
  );
}
