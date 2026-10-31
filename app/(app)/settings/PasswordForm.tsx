"use client";

import { useActionState } from "react";
import { changePassword, type FormState } from "@/app/actions";

export default function PasswordForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(changePassword, undefined);
  return (
    <form className="card" action={action} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <b>Contraseña</b>
      <label className="field">Contraseña actual<input name="current" type="password" autoComplete="current-password" required maxLength={200} /></label>
      <label className="field">Nueva contraseña<input name="next" type="password" autoComplete="new-password" required minLength={8} maxLength={200} /></label>
      {state?.error && <p className="err" role="alert">{state.error}</p>}
      {state?.ok && <p className="okmsg" role="status">{state.ok}</p>}
      <button className="btn" style={{ alignSelf: "flex-start" }} disabled={pending}>{pending ? "Guardando…" : "Cambiar contraseña"}</button>
    </form>
  );
}
