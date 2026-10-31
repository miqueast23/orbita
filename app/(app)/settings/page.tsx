import { requireUser } from "@/lib/auth";
import PasswordForm from "./PasswordForm";
import ProfileForm from "./ProfileForm";

export const metadata = { title: "Ajustes" };

export default async function Settings() {
  const me = await requireUser();
  return (
    <>
      <div className="ph"><h1>Ajustes</h1></div>
      <ProfileForm name={me.name} bio={me.bio ?? ""} industry={me.industry ?? ""} email={me.email} />
      <PasswordForm />
      <div className="card" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <b>Plan</b>
        <span className="muted">Miembro de la comunidad con acceso al Curso Órbita (Edición 15). Los planes de pago se activarán con Stripe.</span>
      </div>
    </>
  );
}
