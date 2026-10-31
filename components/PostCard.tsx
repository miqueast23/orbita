"use client";

import Link from "next/link";
import { useOptimistic, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addComment, deletePost, reportPost, toggleBookmark, toggleLike } from "@/app/actions";
import type { PostView } from "@/lib/data";
import { Avatar, I } from "./ui";
import { toast } from "./bus";

type Me = { initials: string; color: string; staff: boolean };

export default function PostCard({ p, me, full, when }: { p: PostView; me: Me; full?: boolean; when: string }) {
  const router = useRouter();
  const [, start] = useTransition();
  const [like, setLike] = useOptimistic({ on: p.liked, n: p.likes }, (s) => ({ on: !s.on, n: s.n + (s.on ? -1 : 1) }));
  const [saved, setSaved] = useOptimistic(p.saved, (s) => !s);
  const [showC, setShowC] = useState(!!full);
  const [expanded, setExpanded] = useState(false);
  const [menu, setMenu] = useState(false);
  const [sending, setSending] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const href = `/c/${p.space_slug}/${p.id}`;
  const long = p.body.length > 260 && !expanded && !full;
  const nC = p.comments.length;

  const onLike = () => start(async () => { setLike(null); await toggleLike(p.id); });
  const onSave = () => start(async () => { setSaved(null); const on = await toggleBookmark(p.id); toast(on ? "Guardado en tus marcadores" : "Quitado de guardados"); });
  const onAct = async (act: "copy" | "follow" | "report" | "delete") => {
    setMenu(false);
    if (act === "copy") {
      const url = location.origin + href;
      navigator.clipboard?.writeText(url).then(() => toast("Enlace copiado"), () => toast("Enlace: " + url));
    }
    if (act === "follow") toast("Recibirás notificaciones de este post");
    if (act === "report") { await reportPost(p.id); toast("Gracias, un moderador revisará el post"); }
    if (act === "delete") {
      if (!confirm("¿Eliminar este post? No se puede deshacer.")) return;
      const r = await deletePost(p.id);
      toast(r?.error ?? "Post eliminado");
      if (full && !r?.error) router.push(`/c/${p.space_slug}`);
    }
  };
  const onComment = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = input.current?.value.trim();
    if (!v || sending) return;
    setSending(true);
    const r = await addComment(p.id, v);
    setSending(false);
    if (r?.error) return toast(r.error);
    if (input.current) input.current.value = "";
    toast("Comentario publicado");
  };

  return (
    <article className="card post">
      <div className="head">
        {p.author.id ? <Link href={`/u/${p.author.id}`}><Avatar p={p.author} /></Link> : <Avatar p={p.author} />}
        <div style={{ minWidth: 0 }}>
          <div className="who">{p.author.name}{p.author.role === "admin" && <span className="role">Admin</span>}{p.author.role === "moderator" && <span className="role">Moderador</span>}</div>
          <div className="meta">{when} · Publicado en <Link href={`/c/${p.space_slug}`}>{p.space_name}</Link></div>
        </div>
        <div className="tools">
          <button className={`ic ${saved ? "on" : ""}`} aria-label={saved ? "Quitar de guardados" : "Guardar post"} aria-pressed={saved} onClick={onSave}>{I.mark}</button>
          <button className="ic" aria-label="Acciones del post" aria-expanded={menu} onClick={() => setMenu(!menu)}>{I.dots}</button>
          {menu && (
            <div className="menu" onMouseLeave={() => setMenu(false)}>
              <button onClick={() => onAct("copy")}>Copiar enlace</button>
              <button onClick={() => onAct("follow")}>Seguir post</button>
              {p.mine || me.staff ? <button onClick={() => onAct("delete")}>Eliminar post</button> : null}
              {!p.mine && <button onClick={() => onAct("report")}>Reportar</button>}
            </div>
          )}
        </div>
      </div>
      <Link className="ttl-link" href={href}><h3>{p.title}</h3></Link>
      {p.video_duration && (
        <div className="player">
          <span className="ttl">{p.title.replace(/^Webinar: /, "")}</span>
          <button className="bigplay" aria-label="Reproducir" onClick={() => toast("La grabación se conectará con Bunny Stream")}>▶</button>
          <div className="ctrl"><span>0:00</span><div className="trk"><i style={{ width: "0%" }} /></div><span>{p.video_duration}</span></div>
        </div>
      )}
      <div className={`body ${long ? "clip" : ""}`}>{p.body}</div>
      {long && <button className="more" onClick={() => setExpanded(true)}>Ver más</button>}
      <div className="stats"><span>{like.n} {like.n === 1 ? "like" : "likes"}</span><span>{nC} {nC === 1 ? "comentario" : "comentarios"}</span></div>
      <div className="bar">
        <button className={like.on ? "on" : ""} aria-pressed={like.on} onClick={onLike}>{I.heart}Like</button>
        <button onClick={() => { setShowC(!showC); setTimeout(() => input.current?.focus(), 20); }}>{I.chat}Comentar</button>
      </div>
      {showC && (
        <div className="comments">
          {p.comments.map((c) => (
            <div className="cm" key={c.id}>
              <Avatar p={c.author} size="sm" />
              <div className="bubble"><b>{c.author.name}</b><div>{c.body}</div></div>
            </div>
          ))}
          <form className="cform" onSubmit={onComment}>
            <Avatar p={me} size="sm" />
            <input ref={input} placeholder="Escribe un comentario" aria-label="Escribe un comentario" maxLength={2000} />
            <button className="btn" disabled={sending}>Enviar</button>
          </form>
        </div>
      )}
    </article>
  );
}
