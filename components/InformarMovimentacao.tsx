"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "./Toast";
import StatusBadge from "./StatusBadge";
import { CLASSES_ATIVO } from "@/lib/types";

interface PosicaoOpcao {
  id: number;
  ativo: string;
  classe: string;
  valor_atual: number;
  quantidade: number;
}

interface MovimentacaoResumo {
  id: number;
  tipo: "aporte" | "retirada";
  ativo: string;
  valor: number;
  status: "pendente" | "aprovada" | "recusada";
  nota_consultor: string | null;
  criado_em: string;
}

const inputClass =
  "w-full rounded-xl border border-slate-200 dark:border-white/10 bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent-soft)]";

const formatBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// Converte um número pro formato que os campos de Valor/Quantidade esperam
// digitado (vírgula decimal, sem separador de milhar) — os dois campos já
// fazem o caminho inverso com `Number(x.replace(",", "."))` ao enviar.
const paraCampoDecimal = (v: number) => String(v).replace(".", ",");

/** Botão + formulário na carteira do cliente pra informar um aporte ou
 *  retirada feito por fora do app — como ainda não há integração
 *  automática com corretoras, é assim que o cliente avisa o consultor de
 *  uma movimentação real. Nada muda na carteira até o consultor validar
 *  (ver components/RevisarMovimentacoes.tsx, do lado do consultor). */
export default function InformarMovimentacao({
  clienteId,
  posicoes,
  movimentacoes,
}: {
  clienteId: number;
  posicoes: PosicaoOpcao[];
  movimentacoes: MovimentacaoResumo[];
}) {
  const router = useRouter();
  const { mostrarToast } = useToast();
  const [aberto, setAberto] = useState(false);
  const [tipo, setTipo] = useState<"aporte" | "retirada">("aporte");
  const [modo, setModo] = useState<"existente" | "novo">("existente");
  const [posicaoId, setPosicaoId] = useState<string>("");
  const [ativoNovo, setAtivoNovo] = useState("");
  const [classeNova, setClasseNova] = useState<string>(CLASSES_ATIVO[0]);
  const [valor, setValor] = useState("");
  const [quantidade, setQuantidade] = useState("");
  const [observacao, setObservacao] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  // Marca que o cliente quer se desfazer do ativo inteiro (não só uma
  // parte) — em vez de ele ter que calcular e digitar o valor/quantidade
  // certinho na mão, preenche os dois sozinho com o total da posição
  // escolhida (ver handlePosicaoChange/handleRetirarTudoChange abaixo).
  const [retirarTudo, setRetirarTudo] = useState(false);

  const pendentes = movimentacoes.filter((m) => m.status === "pendente");
  const resolvidasRecentes = movimentacoes
    .filter((m) => m.status !== "pendente")
    .slice(0, 3);

  function limpar() {
    setTipo("aporte");
    setModo("existente");
    setPosicaoId("");
    setAtivoNovo("");
    setClasseNova(CLASSES_ATIVO[0]);
    setValor("");
    setQuantidade("");
    setObservacao("");
    setErro(null);
    setRetirarTudo(false);
  }

  // Preenche valor/quantidade com o total da posição informada — chamado
  // tanto ao marcar a caixa "Retirar tudo" quanto ao trocar o ativo
  // selecionado enquanto ela já está marcada.
  function preencherComTotalDaPosicao(posicaoId: string) {
    const posicao = posicoes.find((p) => String(p.id) === posicaoId);
    if (!posicao) return;
    setValor(paraCampoDecimal(Number(posicao.valor_atual.toFixed(2))));
    setQuantidade(paraCampoDecimal(posicao.quantidade));
  }

  function handlePosicaoChange(novoId: string) {
    setPosicaoId(novoId);
    if (retirarTudo) {
      if (novoId) {
        preencherComTotalDaPosicao(novoId);
      } else {
        setValor("");
        setQuantidade("");
      }
    }
  }

  function handleRetirarTudoChange(marcado: boolean) {
    setRetirarTudo(marcado);
    if (marcado && posicaoId) {
      preencherComTotalDaPosicao(posicaoId);
    } else if (!marcado) {
      setValor("");
      setQuantidade("");
    }
  }

  async function enviar() {
    setErro(null);
    const valorNum = Number(valor.replace(",", "."));
    if (!valorNum || valorNum <= 0) {
      setErro("Informe um valor válido.");
      return;
    }
    if (modo === "existente" && !posicaoId) {
      setErro("Selecione o ativo.");
      return;
    }
    if (tipo === "aporte" && modo === "novo" && !ativoNovo.trim()) {
      setErro("Informe o nome do ativo novo.");
      return;
    }

    setEnviando(true);
    try {
      const res = await fetch(`/api/clientes/${clienteId}/movimentacoes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo,
          modo: tipo === "retirada" ? "existente" : modo,
          posicao_id: modo === "existente" ? Number(posicaoId) : undefined,
          ativo: modo === "novo" ? ativoNovo.trim() : undefined,
          classe: modo === "novo" ? classeNova : undefined,
          quantidade: quantidade ? Number(quantidade.replace(",", ".")) : undefined,
          valor: valorNum,
          observacao: observacao.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErro(data.erro ?? "Não foi possível enviar. Tente de novo.");
        return;
      }
      mostrarToast("Enviado! Seu consultor vai validar em breve.");
      limpar();
      setAberto(false);
      router.refresh();
    } catch {
      setErro("Erro de conexão. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="space-y-2">
      {pendentes.length > 0 && (
        <div className="space-y-2">
          {pendentes.map((m) => (
            <div
              key={m.id}
              className="rounded-3xl card-sheen p-4 text-sm shadow-[var(--shadow-card)] ring-1 ring-slate-900/5 dark:ring-white/10"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium text-slate-800 dark:text-slate-100">
                  {m.tipo === "aporte" ? "Aporte" : "Retirada"} em {m.ativo} ·{" "}
                  {formatBRL(m.valor)}
                </p>
                <StatusBadge status={m.status} />
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Enviado em {new Date(m.criado_em).toLocaleDateString("pt-BR")} —
                aguardando validação do seu consultor.
              </p>
            </div>
          ))}
        </div>
      )}

      {!aberto ? (
        <button
          type="button"
          onClick={() => setAberto(true)}
          className="w-full rounded-3xl border border-dashed border-slate-200 dark:border-white/10 bg-white dark:bg-[var(--color-navy-900)] p-4 text-left text-sm font-medium text-[var(--color-navy-950)] dark:text-white shadow-sm"
        >
          + Informar aporte ou retirada
        </button>
      ) : (
        <div className="space-y-3 rounded-3xl card-sheen p-4 shadow-[var(--shadow-card)] ring-1 ring-slate-900/5 dark:ring-white/10">
          <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
            Informar aporte ou retirada
          </p>

          <div className="flex gap-2">
            {(["aporte", "retirada"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setTipo(t);
                  if (t === "retirada") setModo("existente");
                  else handleRetirarTudoChange(false);
                }}
                className={`flex-1 rounded-xl border px-3 py-2 text-sm font-medium ${
                  tipo === t
                    ? "border-[var(--color-navy-950)] bg-[var(--color-navy-950)] text-white"
                    : "border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300"
                }`}
              >
                {t === "aporte" ? "Aporte" : "Retirada"}
              </button>
            ))}
          </div>

          {tipo === "aporte" && (
            <div className="flex gap-2">
              {(["existente", "novo"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setModo(m)}
                  className={`flex-1 rounded-xl border px-3 py-1.5 text-xs font-medium ${
                    modo === m
                      ? "border-[var(--color-navy-950)] bg-[var(--color-navy-950)] text-white"
                      : "border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300"
                  }`}
                >
                  {m === "existente" ? "Ativo que já tenho" : "Ativo novo"}
                </button>
              ))}
            </div>
          )}

          {modo === "existente" ? (
            <div>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                  Ativo
                </span>
                <select
                  value={posicaoId}
                  onChange={(e) => handlePosicaoChange(e.target.value)}
                  className={inputClass}
                >
                  <option value="">Selecione...</option>
                  {posicoes.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.ativo} ({p.classe})
                    </option>
                  ))}
                </select>
              </label>
              {posicoes.length === 0 && (
                <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                  Você ainda não tem nenhum ativo cadastrado.
                </p>
              )}
              {tipo === "retirada" && posicaoId && (
                <label className="mt-2 flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={retirarTudo}
                    onChange={(e) => handleRetirarTudoChange(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 dark:border-white/20 text-[var(--color-accent)] focus:ring-[var(--color-accent-soft)]"
                  />
                  Retirar tudo desse ativo
                </label>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                  Nome do ativo
                </span>
                <input
                  value={ativoNovo}
                  onChange={(e) => setAtivoNovo(e.target.value)}
                  placeholder="Ex: CDB Banco X, PETR4..."
                  className={inputClass}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                  Classe
                </span>
                <select
                  value={classeNova}
                  onChange={(e) => setClasseNova(e.target.value)}
                  className={inputClass}
                >
                  {CLASSES_ATIVO.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                Valor (R$)
              </span>
              <input
                inputMode="decimal"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                placeholder="0,00"
                readOnly={retirarTudo}
                className={`${inputClass} ${retirarTudo ? "opacity-60" : ""}`}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                Quantidade (opcional)
              </span>
              <input
                inputMode="decimal"
                value={quantidade}
                onChange={(e) => setQuantidade(e.target.value)}
                placeholder="Só se souber as unidades"
                readOnly={retirarTudo}
                className={`${inputClass} ${retirarTudo ? "opacity-60" : ""}`}
              />
            </label>
          </div>
          {retirarTudo && (
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              Preenchido automaticamente com o total desse ativo — desmarque a caixa acima pra digitar um valor diferente.
            </p>
          )}

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
              Observação (opcional)
            </span>
            <textarea
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              rows={2}
              maxLength={500}
              className={inputClass}
            />
          </label>

          {erro && <p className="text-xs text-red-600">{erro}</p>}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={enviar}
              disabled={enviando}
              className="rounded-xl btn-accent px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {enviando ? "Enviando..." : "Enviar"}
            </button>
            <button
              type="button"
              onClick={() => {
                limpar();
                setAberto(false);
              }}
              disabled={enviando}
              className="rounded-xl px-3 py-2 text-sm text-slate-500 dark:text-slate-400 disabled:opacity-60"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {resolvidasRecentes.length > 0 && (
        <div className="space-y-1.5 px-1">
          {resolvidasRecentes.map((m) => (
            <div key={m.id} className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">
                {m.tipo === "aporte" ? "Aporte" : "Retirada"} em {m.ativo} ·{" "}
                {formatBRL(m.valor)}
              </span>
              <StatusBadge status={m.status} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
