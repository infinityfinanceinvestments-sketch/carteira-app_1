"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "./Toast";

interface CarteiraModeloOpcao {
  id: number;
  nome: string;
}

const PERGUNTAS_PERFIL = [
  {
    id: "horizonte",
    texto: "Qual o horizonte de investimento do cliente?",
    opcoes: [
      { valor: 1, label: "Até 1 ano" },
      { valor: 2, label: "1 a 3 anos" },
      { valor: 3, label: "Mais de 3 anos" },
    ],
  },
  {
    id: "reacao_queda",
    texto: "Como o cliente reagiria a uma queda de 15% na carteira?",
    opcoes: [
      { valor: 1, label: "Resgataria imediatamente" },
      { valor: 2, label: "Ficaria desconfortável, mas manteria" },
      { valor: 3, label: "Veria como oportunidade de comprar mais" },
    ],
  },
  {
    id: "experiencia",
    texto: "Qual a experiência prévia com investimentos de risco?",
    opcoes: [
      { valor: 1, label: "Nenhuma ou pouca" },
      { valor: 2, label: "Alguma experiência" },
      { valor: 3, label: "Bastante experiência" },
    ],
  },
];

function calcularPerfil(respostas: Record<string, number>) {
  const valores = Object.values(respostas);
  if (valores.length < PERGUNTAS_PERFIL.length) return null;
  const media = valores.reduce((a, b) => a + b, 0) / valores.length;
  if (media < 1.7) return "conservador";
  if (media < 2.4) return "moderado";
  return "arrojado";
}

export default function NovoClienteForm({
  carteirasModelo,
}: {
  carteirasModelo: CarteiraModeloOpcao[];
}) {
  const router = useRouter();
  const { mostrarToast } = useToast();
  const [respostas, setRespostas] = useState<Record<string, number>>({});
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [instituicao, setInstituicao] = useState("");
  const [objetivo, setObjetivo] = useState("");
  const [carteiraModeloId, setCarteiraModeloId] = useState<string>("");
  const [benchmark, setBenchmark] = useState("CDI");
  const [perfilManual, setPerfilManual] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  const perfilSugerido = calcularPerfil(respostas);
  const perfilFinal = perfilManual ?? perfilSugerido ?? "moderado";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setCarregando(true);
    try {
      const res = await fetch("/api/clientes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome,
          email,
          senha,
          perfil_risco: perfilFinal,
          objetivo: objetivo || undefined,
          carteira_modelo_id: carteiraModeloId ? Number(carteiraModeloId) : null,
          benchmark,
          instituicao: instituicao || "Manual",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErro(data.erro ?? "Não foi possível cadastrar o cliente.");
        return;
      }
      mostrarToast("Cliente cadastrado!");
      router.push(`/consultor/clientes/${data.clienteId}`);
      router.refresh();
    } catch {
      setErro("Erro de conexão. Tente novamente.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <section className="space-y-3 rounded-3xl card-sheen p-4 shadow-[var(--shadow-card)] ring-1 ring-slate-900/5 dark:ring-white/10">
        <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Dados do cliente</h2>
        <Campo label="Nome completo">
          <input
            required
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className={inputClass}
          />
        </Campo>
        <Campo label="E-mail (será o login do cliente)">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
        </Campo>
        <Campo label="Senha inicial de acesso">
          <input
            type="text"
            required
            minLength={8}
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            className={inputClass}
            placeholder="mínimo 8 caracteres, com letra e número"
          />
        </Campo>
        <Campo label="Instituição/corretora principal">
          <input
            required
            value={instituicao}
            onChange={(e) => setInstituicao(e.target.value)}
            className={inputClass}
            placeholder="Ex: XP, BTG, Itaú..."
          />
        </Campo>
        <Campo label="Objetivo financeiro (opcional)">
          <textarea
            value={objetivo}
            onChange={(e) => setObjetivo(e.target.value)}
            className={inputClass}
            rows={2}
            placeholder="Ex: aposentadoria em 15 anos, compra de imóvel..."
          />
        </Campo>
      </section>

      <section className="space-y-3 rounded-3xl card-sheen p-4 shadow-[var(--shadow-card)] ring-1 ring-slate-900/5 dark:ring-white/10">
        <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
          Perfil de investidor (suitability)
        </h2>
        {PERGUNTAS_PERFIL.map((p) => (
          <div key={p.id}>
            <p className="mb-1.5 text-sm text-slate-600 dark:text-slate-300">{p.texto}</p>
            <div className="flex flex-wrap gap-2">
              {p.opcoes.map((o) => (
                <button
                  type="button"
                  key={o.valor}
                  onClick={() =>
                    setRespostas((r) => ({ ...r, [p.id]: o.valor }))
                  }
                  className={`rounded-full border px-3 py-1 text-xs ${
                    respostas[p.id] === o.valor
                      ? "border-[var(--color-navy-950)] bg-[var(--color-navy-950)] text-white"
                      : "border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300"
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        ))}

        <div className="rounded-xl bg-slate-50 dark:bg-white/5 p-3">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Perfil sugerido pelas respostas:{" "}
            <span className="font-medium text-slate-700 dark:text-slate-200">
              {perfilSugerido ?? "responda as perguntas acima"}
            </span>
          </p>
          <label className="mt-2 block text-xs font-medium text-slate-600 dark:text-slate-300">
            Perfil final (pode ajustar manualmente)
          </label>
          <select
            value={perfilFinal}
            onChange={(e) => setPerfilManual(e.target.value)}
            className={inputClass + " mt-1"}
          >
            <option value="conservador">Conservador</option>
            <option value="moderado">Moderado</option>
            <option value="arrojado">Arrojado</option>
          </select>
        </div>
      </section>

      <section className="space-y-3 rounded-3xl card-sheen p-4 shadow-[var(--shadow-card)] ring-1 ring-slate-900/5 dark:ring-white/10">
        <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
          Carteira-modelo e benchmark
        </h2>
        <Campo label="Carteira-modelo vinculada">
          <select
            value={carteiraModeloId}
            onChange={(e) => setCarteiraModeloId(e.target.value)}
            className={inputClass}
          >
            <option value="">Nenhuma (definir depois)</option>
            {carteirasModelo.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </Campo>
        <Campo label="Benchmark de referência">
          <select
            value={benchmark}
            onChange={(e) => setBenchmark(e.target.value)}
            className={inputClass}
          >
            <option value="CDI">CDI</option>
            <option value="IBOVESPA">IBOVESPA</option>
            <option value="IPCA+">IPCA+</option>
          </select>
        </Campo>
      </section>

      {erro && (
        <p className="rounded-xl bg-red-50 dark:bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-400">{erro}</p>
      )}

      <button
        type="submit"
        disabled={carregando}
        className="w-full rounded-xl btn-accent px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
      >
        {carregando ? "Cadastrando..." : "Cadastrar cliente"}
      </button>
    </form>
  );
}

const inputClass =
  "w-full rounded-xl border border-slate-200 dark:border-white/10 px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent-soft)]";

function Campo({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
        {label}
      </span>
      {children}
    </label>
  );
}
