import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { SectionToggle } from "@/components/Controls";
import { requireUser } from "@/lib/auth";
import { getCourse } from "@/lib/data";

export default async function CoursePage(props: PageProps<"/courses/[course]">) {
  const me = await requireUser();
  const c = await getCourse((await props.params).course, me.id);
  if (!c) notFound();
  if (c.locked) redirect(`/c/${c.slug}`);
  const n = c.lessons.length;
  const pct = n ? Math.round((c.done / n) * 100) : 0;
  const next = c.lessons.find((l) => !l.done) ?? c.lessons[0];
  const openIdx = Math.max(0, c.sections.findIndex((s) => s.lessons.some((l) => !l.done)));
  const ends = c.access_ends ? new Date(c.access_ends).toLocaleDateString("es-VE", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }) : null;

  return (
    <>
      <div className="ph"><h1>{c.emoji} {c.title}</h1>{next && <Link className="btn" href={`/courses/${c.slug}/${next.id}`}>Continuar</Link>}</div>
      <div className="card" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}><b>Progreso</b><span className="muted">Completaste {c.done} de {n} lecciones · {pct} %</span></div>
        <div className="prog"><i style={{ width: `${pct}%` }} /></div>
        {ends && <span className="muted" style={{ fontSize: 13 }}>Tu acceso a esta edición vence el {ends}.</span>}
      </div>
      {c.sections.map((s, i) => (
        <SectionToggle key={s.id} title={s.title} count={s.lessons.length} open={i === openIdx}>
          {s.lessons.map((l) => (
            <Link key={l.id} className="les" href={`/courses/${c.slug}/${l.id}`} style={{ textDecoration: "none" }}>
              <span className={`ck ${l.done ? "done" : ""}`}>{l.done ? "✓" : ""}</span>
              <span className="nm">{l.title}</span>
              <span className="d">{l.duration}</span>
            </Link>
          ))}
        </SectionToggle>
      ))}
    </>
  );
}
