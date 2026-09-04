import { redirect } from "next/navigation";
import { getSessao } from "@/lib/auth";

export default async function RootPage() {
  const sessao = await getSessao();
  if (!sessao) redirect("/login");
  if (sessao.papel === "consultor") redirect("/consultor/dashboard");
  redirect("/cliente/carteira");
}
