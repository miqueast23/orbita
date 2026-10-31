import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getCourses } from "@/lib/data";

export const metadata = { title: "Courses" };

export default async function Courses() {
  const me = await requireUser();
  const courses = await getCourses(me.id);
  return (
    <>
      <div className="ph"><h1>Courses</h1></div>
      <div className="courses">
        {courses.map((c) => {
          const pct = c.total ? Math.round((c.done / c.total) * 100) : 0;
          return (
            <Link key={c.slug} className="card cc" href={c.locked ? `/c/${c.slug}` : `/courses/${c.slug}`} style={{ textDecoration: "none" }}>
              <div className="cover">{c.emoji}</div>
              <div style={{ fontWeight: 700 }}>{c.title}</div>
              {c.locked ? <div className="muted">No incluido en tu plan</div> : (
                <>
                  <div className="prog"><i style={{ width: `${pct}%` }} /></div>
                  <div className="muted">{c.done} de {c.total} lecciones · {pct} %</div>
                </>
              )}
            </Link>
          );
        })}
      </div>
    </>
  );
}
