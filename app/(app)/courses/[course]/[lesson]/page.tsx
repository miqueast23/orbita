import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CompleteButton, ToastButton } from "@/components/Controls";
import { requireUser } from "@/lib/auth";
import { getCourse } from "@/lib/data";

// Solo se incrustan videos de orígenes conocidos (Bunny Stream, YouTube, Vimeo).
const EMBED_OK = /^https:\/\/(iframe\.mediadelivery\.net|player\.mediadelivery\.net|www\.youtube-nocookie\.com|www\.youtube\.com|player\.vimeo\.com)\//;

export default async function LessonPage(props: PageProps<"/courses/[course]/[lesson]">) {
  const me = await requireUser();
  const { course, lesson } = await props.params;
  const c = await getCourse(course, me.id);
  if (!c) notFound();
  if (c.locked) redirect(`/c/${c.slug}`);
  const idx = c.lessons.findIndex((l) => l.id === Number(lesson));
  if (idx < 0) notFound();
  const l = c.lessons[idx];
  const prev = c.lessons[idx - 1];
  const next = c.lessons[idx + 1];
  const embed = l.video_url && EMBED_OK.test(l.video_url) ? l.video_url : null;

  return (
    <>
      <Link className="btn ghost" style={{ alignSelf: "flex-start" }} href={`/courses/${c.slug}`}>← {c.title}</Link>
      <div className="player">
        {embed ? (
          <iframe src={embed} title={l.title} allow="autoplay; fullscreen; picture-in-picture; encrypted-media" allowFullScreen />
        ) : (
          <>
            <span className="ttl">{l.title}</span>
            <ToastButton className="bigplay" msg="El video de esta lección se cargará desde Bunny Stream">▶</ToastButton>
            <div className="ctrl"><span>0:00</span><div className="trk"><i style={{ width: "0%" }} /></div><span>{l.duration}</span></div>
          </>
        )}
      </div>
      <div className="ph">
        <div><div className="muted">{l.section} · Lección {idx + 1} de {c.lessons.length}</div><h1 style={{ fontSize: 20 }}>{l.title}</h1></div>
        <CompleteButton id={l.id} done={l.done} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
        {prev ? <Link className="btn ghost" href={`/courses/${c.slug}/${prev.id}`}>← Anterior</Link> : <button className="btn ghost" disabled>← Anterior</button>}
        {next ? <Link className="btn ghost" href={`/courses/${c.slug}/${next.id}`}>Siguiente →</Link> : <button className="btn ghost" disabled>Siguiente →</button>}
      </div>
      <div className="card"><b>Comentarios de la lección</b><p className="muted" style={{ margin: "6px 0 0" }}>Comparte dudas o aprendizajes sobre esta lección con tu cohorte en <Link href="/c/generales">Discusiones Generales</Link>.</p></div>
    </>
  );
}
