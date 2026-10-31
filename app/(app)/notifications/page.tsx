import Link from "next/link";
import { readAllNotifications } from "@/app/actions";
import { requireUser } from "@/lib/auth";
import { fmtDate, getNotifications } from "@/lib/data";

export const metadata = { title: "Notificaciones" };

export default async function Notifications() {
  const me = await requireUser();
  const list = await getNotifications(me.id, 100);
  return (
    <>
      <div className="ph">
        <h1>Notificaciones</h1>
        {list.some((n) => !n.read) && <form action={readAllNotifications}><button className="btn ghost">Marcar todo como leído</button></form>}
      </div>
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {list.length === 0 && <p className="empty">Cuando alguien comente o le dé like a tus posts, lo verás aquí.</p>}
        {list.map((n) => (
          <Link key={n.id} className={`prow ${n.read ? "" : "unread"}`} href={n.href}>
            <span className="av sm" style={{ background: "var(--ok)" }}>🔔</span>
            <span className="tx">{n.text}<br /><span className="tm">{fmtDate(n.created_at)}</span></span>
          </Link>
        ))}
      </div>
    </>
  );
}
