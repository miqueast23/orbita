import Link from "next/link";

export default function NotFound() {
  return (
    <div className="auth">
      <div className="card" style={{ textAlign: "center" }}>
        <h1>No encontramos esta página</h1>
        <p className="muted" style={{ margin: 0 }}>Puede que el enlace esté mal escrito o que el contenido se haya eliminado.</p>
        <Link className="btn" href="/feed">Volver al feed</Link>
      </div>
    </div>
  );
}
