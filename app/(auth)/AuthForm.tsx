"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login, register, type FormState } from "@/app/actions";

export default function AuthForm({ mode }: { mode: "login" | "registro" }) {
  const isLogin = mode === "login";
  const [state, action, pending] = useActionState<FormState, FormData>(isLogin ? login : register, undefined);
  return (
    <div className="auth">
      <form className="card" action={action}>
        <span className="brand"><span className="mk" aria-hidden="true" />Órbita</span>
        <h1>{isLogin ? "Entra a la comunidad" : "Crea tu cuenta"}</h1>
        {!isLogin && (
          <label className="field">Nombre
            <input name="name" autoComplete="name" required minLength={2} maxLength={80} />
          </label>
        )}
        <label className="field">Correo
          <input name="email" type="email" autoComplete="email" required maxLength={200} />
        </label>
        <label className="field">Contraseña
          <input name="password" type="password" autoComplete={isLogin ? "current-password" : "new-password"} required minLength={isLogin ? 1 : 8} maxLength={200} />
        </label>
        {state?.error && <p className="err" role="alert">{state.error}</p>}
        <button className="btn" disabled={pending}>{pending ? "Un momento…" : isLogin ? "Entrar" : "Crear cuenta"}</button>
        <p className="muted" style={{ margin: 0, textAlign: "center" }}>
          {isLogin ? <>¿No tienes cuenta? <Link href="/registro">Regístrate</Link></> : <>¿Ya tienes cuenta? <Link href="/login">Entra</Link></>}
        </p>
      </form>
    </div>
  );
}
