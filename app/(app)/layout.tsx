import Link from "next/link";
import Shell from "@/components/Shell";
import { Avatar, dayMonth, timeOf } from "@/components/ui";
import { isStaff, requireUser } from "@/lib/auth";
import { fmtDate, getConversations, getEvents, getNotifications, getSpaces, getTrending } from "@/lib/data";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const me = await requireUser();
  const [spaces, notifs, convos, trending, events] = await Promise.all([
    getSpaces(me.id), getNotifications(me.id, 8), getConversations(me.id), getTrending(), getEvents(me.id, 2),
  ]);

  const rail = (
    <>
      <div className="card">
        <h2>Trending posts</h2>
        {trending.map((p) => {
          const who = p.anonymous ? { name: "Miembro anónimo", initials: "?", color: "#6b6f76" } : p;
          return (
            <Link key={p.id} className="trend" href={`/c/${p.space_slug}/${p.id}`}>
              <Avatar p={who} size="sm" />
              <span><span className="t">{p.title}</span><br /><span className="a">{who.name}</span></span>
            </Link>
          );
        })}
      </div>
      <div className="card">
        <h2>Próximos eventos</h2>
        {events.length === 0 && <p className="muted" style={{ margin: 0 }}>No hay eventos programados.</p>}
        {events.map((e) => {
          const dm = dayMonth(e.starts_at);
          return (
            <Link key={e.id} className="trend" href="/c/encuentros">
              <span className="date" style={{ width: 44, padding: "3px 0" }}><b style={{ fontSize: 16 }}>{dm.d}</b><span>{dm.m}</span></span>
              <span><span className="t">{e.title}</span><br /><span className="a">{e.kind} · {timeOf(e.starts_at)}</span></span>
            </Link>
          );
        })}
      </div>
    </>
  );

  return (
    <Shell
      me={{ id: me.id, name: me.name, initials: me.initials, color: me.color, staff: isStaff(me) }}
      spaces={spaces.map(({ slug, group_name, emoji, name, kind, admin_only_post, url, unread }) => ({ slug, group_name, emoji, name, kind, admin_only_post, url, unread }))}
      notifs={notifs.map((n) => ({ id: n.id, text: n.text, href: n.href, read: n.read, when: fmtDate(n.created_at) }))}
      convos={convos.map((c) => ({ other: c.other, name: c.name, initials: c.initials, color: c.color, last: c.last, unread: c.unread, when: fmtDate(c.created_at) }))}
      rail={rail}
    >
      {children}
    </Shell>
  );
}
