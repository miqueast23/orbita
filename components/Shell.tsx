"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useActionState, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { createPost, logout, readAllNotifications, readNotification, type FormState } from "@/app/actions";
import { Avatar, I } from "./ui";
import { toast } from "./bus";

type SpaceLite = { slug: string; group_name: string; emoji: string; name: string; kind: string; admin_only_post: boolean; url: string | null; unread: number };
type Notif = { id: number; text: string; href: string; read: boolean; when: string };
type Convo = { other: string; name: string; initials: string; color: string; last: string; unread: boolean; when: string };
type Me = { id: string; name: string; initials: string; color: string; staff: boolean };

export default function Shell(props: {
  me: Me; spaces: SpaceLite[]; notifs: Notif[]; convos: Convo[]; rail: ReactNode; children: ReactNode;
}) {
  const { me, spaces, notifs, convos } = props;
  const path = usePathname();
  const router = useRouter();
  const [panel, setPanel] = useState<null | "notif" | "dm" | "me">(null);
  const [side, setSide] = useState(false);
  const [search, setSearch] = useState(false);
  const [compose, setCompose] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [closed, setClosed] = useState<Set<string>>(new Set());
  const iconsRef = useRef<HTMLDivElement>(null);

  // grupos plegados recordados en este navegador
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- lee localStorage solo en el cliente, tras hidratar
    try { setClosed(new Set(JSON.parse(localStorage.getItem("orbita-closed") || "[]"))); } catch {}
  }, []);
  const toggleGroup = (g: string) => setClosed((prev) => {
    const next = new Set(prev);
    if (next.has(g)) next.delete(g); else next.add(g);
    try { localStorage.setItem("orbita-closed", JSON.stringify([...next])); } catch {}
    return next;
  });

  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const onToast = (e: Event) => { setMsg((e as CustomEvent<string>).detail); clearTimeout(t); t = setTimeout(() => setMsg(null), 2200); };
    const onCompose = (e: Event) => setCompose((e as CustomEvent<string>).detail ?? "");
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setPanel(null); setSearch(false); setCompose(null); setSide(false); } };
    const onClick = (e: MouseEvent) => { if (iconsRef.current && !iconsRef.current.contains(e.target as Node)) setPanel(null); };
    window.addEventListener("orbita:toast", onToast);
    window.addEventListener("orbita:compose", onCompose);
    document.addEventListener("keydown", onKey);
    document.addEventListener("click", onClick);
    return () => {
      window.removeEventListener("orbita:toast", onToast);
      window.removeEventListener("orbita:compose", onCompose);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("click", onClick);
    };
  }, []);

  // al cambiar de ruta se cierran el cajón y los paneles
  const [lastPath, setLastPath] = useState(path);
  if (path !== lastPath) { setLastPath(path); setSide(false); setPanel(null); }

  const top = path.startsWith("/courses") || path.startsWith("/c/curso") ? "courses" : path.startsWith("/leaderboard") ? "leaderboard" : path.startsWith("/feed") || path.startsWith("/c/") ? "feed" : "";
  const tabs: [string, string, string][] = [["feed", "/feed", "Home"], ["courses", "/courses", "Courses"], ["leaderboard", "/leaderboard", "Leaderboard"]];
  const groups = [...new Set(spaces.map((s) => s.group_name))];
  const isCur = (s: SpaceLite) => path === `/c/${s.slug}` || path.startsWith(`/c/${s.slug}/`) || (s.kind === "course" && path.startsWith(`/courses/${s.slug}`));

  const toggleTheme = () => {
    const root = document.documentElement;
    const dark = root.dataset.theme ? root.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
    root.dataset.theme = dark ? "light" : "dark";
    try { localStorage.setItem("orbita-theme", root.dataset.theme); } catch {}
    setPanel(null);
  };

  return (
    <>
      <header className="hdr">
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button className="burger" aria-label="Abrir menú" onClick={() => setSide(true)}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
          </button>
          <Link className="brand" href="/feed"><span className="mk" aria-hidden="true" />Órbita</Link>
        </div>
        <nav className="tabsTop" aria-label="Secciones">
          {tabs.map(([k, href, label]) => <Link key={k} href={href} aria-current={top === k ? "page" : undefined}>{label}</Link>)}
        </nav>
        <div className="icons" ref={iconsRef}>
          <button className="ic" aria-label="Buscar" onClick={() => { setPanel(null); setSearch(true); }}>{I.search}</button>
          <button className="ic" aria-label="Notificaciones" aria-expanded={panel === "notif"} onClick={() => setPanel(panel === "notif" ? null : "notif")}>
            {I.bell}{notifs.some((n) => !n.read) && <i className="pip" />}
          </button>
          <button className="ic" aria-label="Mensajes directos" aria-expanded={panel === "dm"} onClick={() => setPanel(panel === "dm" ? null : "dm")}>
            {I.chat}{convos.some((c) => c.unread) && <i className="pip" />}
          </button>
          <Link className="ic" href="/bookmarks" aria-label="Guardados">{I.mark}</Link>
          <button className="me-btn" aria-label="Menú de usuario" aria-expanded={panel === "me"} onClick={() => setPanel(panel === "me" ? null : "me")}><Avatar p={me} /></button>

          {panel === "notif" && (
            <div className="panel">
              <h3>Notificaciones<button onClick={async () => { await readAllNotifications(); }}>Marcar todo como leído</button></h3>
              {notifs.length === 0 && <p className="empty">No tienes notificaciones.</p>}
              {notifs.map((n) => (
                <button key={n.id} className={`prow ${n.read ? "" : "unread"}`} onClick={async () => { setPanel(null); router.push(n.href); if (!n.read) await readNotification(n.id); router.refresh(); }}>
                  <span className="av sm" style={{ background: "var(--ok)" }}>🔔</span>
                  <span className="tx">{n.text}<br /><span className="tm">{n.when}</span></span>
                </button>
              ))}
              <Link className="prow" href="/notifications" style={{ justifyContent: "center", color: "var(--link)" }}>Ver todas</Link>
            </div>
          )}
          {panel === "dm" && (
            <div className="panel">
              <h3>Mensajes<button onClick={() => router.push("/members")}>Nuevo</button></h3>
              {convos.length === 0 && <p className="empty">Aún no tienes conversaciones.</p>}
              {convos.map((c) => (
                <Link key={c.other} className={`prow ${c.unread ? "unread" : ""}`} href={`/messages/${c.other}`}>
                  <Avatar p={c} size="sm" />
                  <span className="tx"><b>{c.name}</b> · <span className="tm">{c.when}</span><br />{c.last.slice(0, 80)}</span>
                </Link>
              ))}
            </div>
          )}
          {panel === "me" && (
            <div className="panel" style={{ width: 240 }}>
              <h3>{me.name}</h3>
              <Link className="prow" href={`/u/${me.id}`}>Mi perfil</Link>
              <Link className="prow" href="/leaderboard">Mis puntos</Link>
              <Link className="prow" href="/bookmarks">Guardados</Link>
              <Link className="prow" href="/settings">Ajustes</Link>
              <button className="prow" onClick={toggleTheme}>Cambiar tema claro u oscuro</button>
              <form action={logout}><button className="prow">Cerrar sesión</button></form>
            </div>
          )}
        </div>
      </header>

      <div className="app">
        <aside className={`side ${side ? "open" : ""}`} aria-label="Espacios">
          <div className="grp">
            <Link className="it" href="/feed" aria-current={path === "/feed" ? "page" : undefined}><span className="em">☷</span><span className="nm">Feed</span></Link>
            <Link className="it" href="/members" aria-current={path === "/members" ? "page" : undefined}><span className="em">👥</span><span className="nm">Miembros</span></Link>
          </div>
          {groups.map((g) => (
            <div key={g} className={`grp ${closed.has(g) ? "closed" : ""}`}>
              <button className="gl" aria-expanded={!closed.has(g)} onClick={() => toggleGroup(g)}>{g}<span>▾</span></button>
              {spaces.filter((s) => s.group_name === g).map((s) => {
                const inner = <><span className="em">{s.emoji}</span><span className="nm">{s.name}</span>{s.unread > 0 && !isCur(s) && <span className="badge">{s.unread > 9 ? "9+" : s.unread}</span>}</>;
                if (s.kind === "link") {
                  return s.url
                    ? <a key={s.slug} className="it" href={s.url} target="_blank" rel="noopener noreferrer">{inner}</a>
                    : <button key={s.slug} className="it" onClick={() => toast("Este enlace aún no está configurado")}>{inner}</button>;
                }
                const href = s.kind === "course" ? `/courses/${s.slug}` : `/c/${s.slug}`;
                return <Link key={s.slug} className="it" href={href} aria-current={isCur(s) ? "page" : undefined}>{inner}</Link>;
              })}
            </div>
          ))}
        </aside>
        <div className={`scrimSide ${side ? "on" : ""}`} onClick={() => setSide(false)} />
        <main id="main">
          <nav className="mtabs" aria-label="Secciones">
            {tabs.map(([k, href, label]) => <Link key={k} href={href} aria-current={top === k ? "page" : undefined}>{label}</Link>)}
          </nav>
          {props.children}
        </main>
        <aside className="ctx" aria-label="Tendencias">{props.rail}</aside>
      </div>

      {search && <SearchDialog onClose={() => setSearch(false)} />}
      {compose !== null && <Composer space={compose} spaces={spaces} staff={me.staff} onClose={() => setCompose(null)} />}
      {msg && <div className="toast" role="status">{msg}</div>}
    </>
  );
}

function Scrim({ onClose, children, top }: { onClose: () => void; children: ReactNode; top?: boolean }) {
  return (
    <div className="scrim" style={top ? { alignItems: "start", paddingTop: 80 } : undefined} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      {children}
    </div>
  );
}

function Composer({ space, spaces, staff, onClose }: { space: string; spaces: SpaceLite[]; staff: boolean; onClose: () => void }) {
  const [state, action, pending] = useActionState<FormState, FormData>(createPost, undefined);
  const postable = spaces.filter((s) => (s.kind === "posts" || s.kind === "anon") && (staff || !s.admin_only_post));
  const target = postable.some((s) => s.slug === space) ? space : postable.find((s) => s.slug === "generales")?.slug ?? postable[0]?.slug;
  return (
    <Scrim onClose={onClose}>
      <form className="modal" role="dialog" aria-label="Nuevo post" action={action}>
        <header><b>Crear post</b><button type="button" className="x" aria-label="Cerrar" onClick={onClose}>×</button></header>
        <div className="mb">
          <input className="ttlin" name="title" placeholder="Título" required maxLength={140} autoFocus aria-label="Título" />
          <textarea name="body" placeholder="Escribe algo…" required maxLength={10000} aria-label="Texto del post" />
          {state?.error && <p className="err" role="alert">{state.error}</p>}
        </div>
        <footer>
          <label className="muted" style={{ display: "flex", gap: 8, alignItems: "center" }}>Publicar en
            <select name="space" defaultValue={target} style={{ width: "auto" }}>
              {postable.map((s) => <option key={s.slug} value={s.slug}>{s.emoji} {s.name}</option>)}
            </select>
          </label>
          <button className="btn" disabled={pending}>{pending ? "Publicando…" : "Publicar"}</button>
        </footer>
      </form>
    </Scrim>
  );
}

type Hit = { kind: "space" | "post" | "lesson" | "member"; title: string; sub: string; href: string };

function SearchDialog({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[] | null>(null);
  const router = useRouter();
  const run = useCallback(async (text: string, signal: AbortSignal) => {
    const res = await fetch(`/api/search?q=${encodeURIComponent(text)}`, { signal });
    if (res.ok) setHits(await res.json());
  }, []);
  useEffect(() => {
    if (q.trim().length < 2) return;
    const ctl = new AbortController();
    const t = setTimeout(() => run(q.trim(), ctl.signal).catch(() => {}), 200);
    return () => { clearTimeout(t); ctl.abort(); };
  }, [q, run]);
  const shown = q.trim().length < 2 ? null : hits;
  return (
    <Scrim onClose={onClose} top>
      <div className="modal" role="dialog" aria-label="Buscar">
        <div className="searchbox">⌕<input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Busca posts, espacios, lecciones y miembros" aria-label="Buscar" /><button className="x" aria-label="Cerrar" onClick={onClose}>×</button></div>
        <div>
          {shown === null && <p className="empty">Escribe para buscar.</p>}
          {shown?.length === 0 && <p className="empty">Sin resultados para &quot;{q}&quot;.</p>}
          {shown?.map((h, i) => (
            <button key={i} className="prow" onClick={() => { onClose(); router.push(h.href); }}>
              <span className="tx"><b>{h.title}</b><br /><span className="tm">{h.sub}</span></span>
            </button>
          ))}
        </div>
      </div>
    </Scrim>
  );
}
