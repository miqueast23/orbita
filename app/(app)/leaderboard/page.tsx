import Link from "next/link";
import { Avatar } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getLeaderboard, getPoints, levelFor, LEVELS, type Period } from "@/lib/data";

export const metadata = { title: "Leaderboard" };

const PERIODS: [Period, string][] = [["7", "7 days"], ["30", "30 days"], ["all", "All time"]];

export default async function Leaderboard(props: PageProps<"/leaderboard">) {
  const me = await requireUser();
  const q = (await props.searchParams).periodo;
  const period: Period = q === "30" || q === "all" ? q : "7";
  const [rows, total] = await Promise.all([getLeaderboard(period), getPoints(me.id, "all")]);
  const L = levelFor(total);

  return (
    <>
      <div className="ph">
        <h1>Leaderboard</h1>
        <div className="seg" role="group" aria-label="Periodo">
          {PERIODS.map(([k, l]) => (
            <Link key={k} href={`/leaderboard?periodo=${k}`} aria-current={period === k ? "page" : undefined}>{l}</Link>
          ))}
        </div>
      </div>
      <div className="card" style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
        <Avatar p={me} size={44} />
        <div style={{ flex: 1, minWidth: 180 }}>
          <div style={{ fontWeight: 700 }}>{me.name}</div>
          <div className="muted">{total} puntos · Nivel {L.name}{L.next ? ` · ${L.next[1] - total} puntos para ${L.next[0]}` : ""}</div>
        </div>
        <span style={{ fontSize: 28 }} aria-hidden="true">🏆</span>
      </div>
      <div className="card" style={{ overflowX: "auto" }}>
        {rows.length === 0 ? <p className="empty">Nadie ha sumado puntos en este periodo.</p> : (
          <table><tbody>
            {rows.map((r, i) => (
              <tr key={r.id} style={r.id === me.id ? { fontWeight: 700 } : undefined}>
                <td className="n">{i + 1}</td>
                <td><Link href={`/u/${r.id}`} style={{ display: "flex", gap: 10, alignItems: "center", textDecoration: "none" }}><Avatar p={r} size="sm" />{r.name}</Link></td>
                <td className="p">{r.points} pts</td>
              </tr>
            ))}
          </tbody></table>
        )}
      </div>
      <div className="card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <b>Niveles</b>
        <div className="lvls">{LEVELS.map(([n, m]) => <div key={n} className={`lv ${n === L.name ? "cur" : ""}`}>{n}<span>{m} pts</span></div>)}</div>
        <details>
          <summary>¿Cómo funcionan los puntos?</summary>
          <p className="muted" style={{ margin: "8px 0 0" }}>Ganas 2 puntos por cada post nuevo, 1 por cada comentario, 1 cuando alguien le da like a tu post y 1 por cada lección completada. Subes de nivel al alcanzar el umbral de puntos acumulados.</p>
        </details>
      </div>
    </>
  );
}
