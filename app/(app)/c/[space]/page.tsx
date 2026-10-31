import { notFound, redirect } from "next/navigation";
import { ComposeCard, NewPostButton, RsvpButton, SortSelect, ToastButton } from "@/components/Controls";
import PostList from "@/components/PostList";
import { dayMonth, timeOf } from "@/components/ui";
import { isStaff, requireUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { getEvents, getPosts, markSpaceRead, type Space } from "@/lib/data";

async function spaceBySlug(slug: string) {
  return (await sql`select * from spaces where slug = ${slug}`)[0] as Space | undefined;
}

export async function generateMetadata(props: PageProps<"/c/[space]">) {
  const s = await spaceBySlug((await props.params).space);
  return { title: s?.name ?? "Espacio" };
}

export default async function SpacePage(props: PageProps<"/c/[space]">) {
  const me = await requireUser();
  const { space } = await props.params;
  const s = await spaceBySlug(space);
  if (!s) notFound();
  if (s.kind === "course") redirect(`/courses/${s.slug}`);
  await markSpaceRead(me.id, s.id);

  const title = <div className="ph"><h1>{s.emoji} {s.name}</h1>{(s.kind === "posts" || s.kind === "anon") && (!s.admin_only_post || isStaff(me)) && <NewPostButton space={s.slug} label={s.kind === "anon" ? "Preguntar en anónimo" : "New post"} />}</div>;

  if (s.kind === "locked") {
    return (
      <>
        {title}
        <div className="card" style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: 12, alignItems: "center", padding: "40px 20px" }}>
          <div style={{ fontSize: 40 }}>🔒</div>
          <h2 style={{ fontSize: 18 }}>Este curso no está incluido en tu plan</h2>
          <p className="muted" style={{ margin: 0, maxWidth: "44ch" }}>Desbloquéalo para acceder a 12 módulos sobre producto con IA, sesiones en vivo y plantillas.</p>
          <ToastButton msg="El pago con Stripe se activará pronto">Desbloquear curso</ToastButton>
        </div>
      </>
    );
  }

  if (s.kind === "events") {
    const events = await getEvents(me.id);
    return (
      <>
        {title}
        {events.length === 0 && <div className="card empty">No hay encuentros programados.</div>}
        {events.map((e) => {
          const dm = dayMonth(e.starts_at);
          return (
            <div className="card ev" key={e.id}>
              <div className="date"><b>{dm.d}</b><span>{dm.m}</span></div>
              <div className="grow">
                <div style={{ fontWeight: 700, fontSize: 15 }}>{e.title}</div>
                <div className="muted">{e.kind} · {timeOf(e.starts_at)} · {e.going} asistirán</div>
              </div>
              <RsvpButton id={e.id} on={e.rsvp} />
            </div>
          );
        })}
      </>
    );
  }

  if (s.kind === "link") return <>{title}<div className="card empty">Este enlace abre un sitio externo.</div></>;

  const sort = (await props.searchParams).orden === "popular" ? "popular" : "latest";
  const posts = await getPosts(me, { spaceId: s.id, sort });
  const canPost = !s.admin_only_post || isStaff(me);
  return (
    <>
      {title}
      {s.kind === "anon" && <div className="card muted">Tu nombre no se mostrará en las preguntas de este espacio.</div>}
      {s.admin_only_post && !isStaff(me) && <div className="card muted">En este espacio publica el equipo de Órbita. Puedes comentar y dar like.</div>}
      {canPost && <ComposeCard space={s.slug} me={me} />}
      {posts.length > 1 && <SortSelect value={sort} count={posts.length} />}
      <PostList posts={posts} me={me} empty={canPost ? "Aún no hay publicaciones. Sé el primero en publicar." : "Aún no hay publicaciones."} />
    </>
  );
}
