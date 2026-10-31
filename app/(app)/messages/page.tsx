import Link from "next/link";
import { Avatar } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { fmtDate, getConversations } from "@/lib/data";

export const metadata = { title: "Mensajes" };

export default async function Messages() {
  const me = await requireUser();
  const convos = await getConversations(me.id);
  return (
    <>
      <div className="ph"><h1>Mensajes</h1><Link className="btn" href="/members">Nuevo mensaje</Link></div>
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {convos.length === 0 && <p className="empty">Aún no tienes conversaciones. Abre el perfil de un miembro para escribirle.</p>}
        {convos.map((c) => (
          <Link key={c.other} className={`prow ${c.unread ? "unread" : ""}`} href={`/messages/${c.other}`}>
            <Avatar p={c} size="sm" />
            <span className="tx"><b>{c.name}</b> · <span className="tm">{fmtDate(c.created_at)}</span><br />{c.last.slice(0, 120)}</span>
          </Link>
        ))}
      </div>
    </>
  );
}
