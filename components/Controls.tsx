"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toggleLesson, toggleRsvp } from "@/app/actions";
import { Avatar } from "./ui";
import { openComposer, toast } from "./bus";

export function NewPostButton({ space = "", label = "New post" }: { space?: string; label?: string }) {
  return <button className="btn" onClick={() => openComposer(space)}>{label}</button>;
}

export function ComposeCard({ space = "", me }: { space?: string; me: { initials: string; color: string } }) {
  return (
    <div className="card compose" onClick={() => openComposer(space)}>
      <Avatar p={me} />
      <button className="fake" onClick={(e) => { e.stopPropagation(); openComposer(space); }}>Start a post</button>
    </div>
  );
}

export function SortSelect({ value, count }: { value: string; count: number }) {
  const router = useRouter();
  const params = useSearchParams();
  return (
    <div className="sortrow">
      <span>{count} {count === 1 ? "publicación" : "publicaciones"}</span>
      <label>Ordenar{" "}
        <select value={value} onChange={(e) => {
          const q = new URLSearchParams(params);
          q.set("orden", e.target.value);
          router.replace(`?${q}`, { scroll: false });
        }}>
          <option value="latest">Más recientes</option>
          <option value="popular">Más populares</option>
        </select>
      </label>
    </div>
  );
}

export function RsvpButton({ id, on }: { id: number; on: boolean }) {
  const [pending, start] = useTransition();
  return (
    <button className={`btn ${on ? "ok" : ""}`} disabled={pending} onClick={() => start(async () => {
      const now = await toggleRsvp(id);
      toast(now ? "Confirmado. Te enviaremos un recordatorio." : "Asistencia cancelada");
    })}>{on ? "✓ Asistiré" : "Confirmar asistencia"}</button>
  );
}

export function CompleteButton({ id, done }: { id: number; done: boolean }) {
  const [pending, start] = useTransition();
  return (
    <button className={`btn ${done ? "ok" : ""}`} disabled={pending} onClick={() => start(async () => {
      const now = await toggleLesson(id);
      if (now) toast("+1 punto · lección completada");
    })}>{done ? "✓ Completada" : "Marcar como completada"}</button>
  );
}

export function SectionToggle({ title, count, open, children }: { title: string; count: number; open: boolean; children: React.ReactNode }) {
  const [isOpen, setOpen] = useState(open);
  return (
    <div className="sec">
      <button aria-expanded={isOpen} onClick={() => setOpen(!isOpen)}>
        <span>{title}</span><small>{count} lecciones {isOpen ? "▴" : "▾"}</small>
      </button>
      {isOpen && children}
    </div>
  );
}

// Muestra un aviso una sola vez cuando la URL trae ?nuevo=1 (post recién publicado).
export function NewPostNotice() {
  const params = useSearchParams();
  const router = useRouter();
  useEffect(() => {
    if (params.get("nuevo") === "1") {
      toast("+2 puntos · post publicado");
      router.replace(location.pathname, { scroll: false });
    }
  }, [params, router]);
  return null;
}

export function ToastButton({ msg, children, className = "btn" }: { msg: string; children: React.ReactNode; className?: string }) {
  return <button className={className} onClick={() => toast(msg)}>{children}</button>;
}
