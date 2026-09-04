import { redirect } from "next/navigation";
import { getSessao } from "@/lib/auth";
import { TITULO_TERMOS, TEXTO_TERMOS } from "@/lib/termos";
import AceitarTermosButton from "@/components/AceitarTermosButton";

export default async function TermosPage() {
  const sessao = await getSessao();
  if (!sessao) redirect("/login");

  const destino = sessao.papel === "consultor" ? "/consultor/dashboard" : "/cliente/carteira";

  return (
    <main className="hero-organic flex min-h-screen flex-col items-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-2xl">
            📄
          </div>
          <h1 className="text-xl font-semibold text-white">{TITULO_TERMOS}</h1>
          <p className="mt-1 text-sm text-white/60">
            Antes de continuar, dá uma lida rápida — é curto.
          </p>
        </div>

        <div className="max-h-[55vh] overflow-y-auto rounded-2xl bg-white p-5 text-sm leading-relaxed whitespace-pre-line text-slate-700 shadow-xl shadow-black/20">
          {TEXTO_TERMOS}
        </div>

        <div className="mt-4">
          <AceitarTermosButton destino={destino} />
        </div>
      </div>
    </main>
  );
}
