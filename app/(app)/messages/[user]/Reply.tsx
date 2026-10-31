"use client";

import { useRef, useState } from "react";
import { sendMessage } from "@/app/actions";
import { toast } from "@/components/bus";

export default function Reply({ to }: { to: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const [sending, setSending] = useState(false);
  return (
    <form className="cform" onSubmit={async (e) => {
      e.preventDefault();
      const v = ref.current?.value.trim();
      if (!v || sending) return;
      setSending(true);
      const r = await sendMessage(to, v);
      setSending(false);
      if (r?.error) return toast(r.error);
      if (ref.current) ref.current.value = "";
    }}>
      <input ref={ref} placeholder="Escribe un mensaje" aria-label="Escribe un mensaje" maxLength={4000} autoFocus />
      <button className="btn" disabled={sending}>Enviar</button>
    </form>
  );
}
