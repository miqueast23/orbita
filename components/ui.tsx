import type { CSSProperties } from "react";

export function Avatar({ p, size, style }: { p: { initials: string; color: string }; size?: "sm" | number; style?: CSSProperties }) {
  const dim = typeof size === "number" ? { width: size, height: size } : {};
  return (
    <span className={`av ${size === "sm" ? "sm" : ""}`} style={{ background: p.color, ...dim, ...style }} aria-hidden="true">
      {p.initials}
    </span>
  );
}

const svg = (d: React.ReactNode) => <svg viewBox="0 0 24 24" aria-hidden="true">{d}</svg>;
export const I = {
  heart: svg(<path d="M12 20s-7-4.4-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.6-7 10-7 10z" />),
  chat: svg(<path d="M4 5h16v11H8l-4 4z" />),
  mark: svg(<path d="M6 3h12v18l-6-4-6 4z" />),
  dots: svg(<><circle cx="5" cy="12" r="1.3" /><circle cx="12" cy="12" r="1.3" /><circle cx="19" cy="12" r="1.3" /></>),
  search: svg(<><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></>),
  bell: svg(<><path d="M6 8a6 6 0 0112 0c0 7 3 8 3 8H3s3-1 3-8" /><path d="M10 20a2 2 0 004 0" /></>),
};

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
export function dayMonth(d: string | Date) {
  const parts = new Intl.DateTimeFormat("es-VE", { day: "2-digit", month: "numeric", timeZone: "America/Caracas" }).formatToParts(new Date(d));
  const day = parts.find((p) => p.type === "day")?.value ?? "";
  const month = Number(parts.find((p) => p.type === "month")?.value ?? 1);
  return { d: day, m: MONTHS[month - 1] };
}
export const timeOf = (d: string | Date) =>
  new Date(d).toLocaleTimeString("es-VE", { hour: "numeric", minute: "2-digit", timeZone: "America/Caracas" });
