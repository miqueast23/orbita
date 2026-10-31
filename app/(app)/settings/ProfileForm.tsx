"use client";

import { useActionState } from "react";
import { updateProfile, type FormState } from "@/app/actions";

export default function ProfileForm({ name, bio, industry, email }: { name: string; bio: string; industry: string; email: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(updateProfile, undefined);
  return (
    <form className="card" action={action} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <b>Perfil</b>
      <label className="field">Nombre<input name="name" defaultValue={name} required minLength={2} maxLength={80} /></label>
      <label className="field">Industria<input name="industry" defaultValue={industry} maxLength={80} placeholder="Ej.: Fintech, e-commerce, educación" /></label>
      <label className="field">Bio<textarea name="bio" defaultValue={bio} maxLength={500} rows={4} placeholder="Cuéntale a la comunidad a qué te dedicas" /></label>
      <span className="muted" style={{ fontSize: 13 }}>Correo: {email}</span>
      {state?.error && <p className="err" role="alert">{state.error}</p>}
      {state?.ok && <p className="okmsg" role="status">{state.ok}</p>}
      <button className="btn" style={{ alignSelf: "flex-start" }} disabled={pending}>{pending ? "Guardando…" : "Guardar"}</button>
    </form>
  );
}
