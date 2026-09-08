import { redirect } from "next/navigation";
import { getSessao } from "@/lib/auth";
import { getAceiteTermos } from "@/lib/repo";
import { VERSAO_TERMOS } from "@/lib/termos";
import BottomNav from "@/components/BottomNav";
import LogoutButton from "@/components/LogoutButton";
import ThemeToggle from "@/components/ThemeToggle";
import PullToRefresh from "@/components/PullToRefresh";

const NAV_ITEMS = [
  { href: "/consultor/dashboard", label: "Início", icon: "🏠" },
  { href: "/consultor/clientes", label: "Clientes", icon: "👥" },
  { href: "/consultor/carteiras-modelo", label: "Modelos", icon: "🎯" },
  { href: "/consultor/importar", label: "Importar", icon: "⬆️" },
];

export default async function ConsultorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sessao = await getSessao();

  if (sessao && !getAceiteTermos(sessao.userId, VERSAO_TERMOS)) {
    redirect("/termos");
  }

  return (
    <div className="flex min-h-screen flex-col pb-24">
      <header className="hero-organic sticky top-0 z-10 flex items-center justify-between rounded-b-[28px] px-4 py-4 text-white">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--color-sky)] to-[var(--color-accent)] text-base">
            ✦
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-white/50">
              Consultor
            </p>
            <p className="text-sm font-semibold">{sessao?.nome}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <LogoutButton />
        </div>
      </header>
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-5">
        <PullToRefresh>{children}</PullToRefresh>
      </main>
      <BottomNav items={NAV_ITEMS} />
    </div>
  );
}
