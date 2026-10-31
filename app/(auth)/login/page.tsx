import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import AuthForm from "../AuthForm";

export const metadata = { title: "Entrar" };

export default async function Page() {
  if (await getUser()) redirect("/feed");
  return <AuthForm mode="login" />;
}
