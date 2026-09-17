"use client";

import { useMemo, useState } from "react";
import { useToast } from "./Toast";

type TipoObjetivo = "quantidade_ativo" | "valor_ativo" | "valor_livre";

interface Objetivo {
  id: number;
  titulo: string;
  descricao: string | null;
  tipo: TipoObjetivo;
  ativo: string | null;
  meta_quantidade: number | null;
  meta_valor: number | null;
  progresso_manual: number;
  concluido_em: string | null;
  valorAtual: number;
  meta: number;
  progressoPercentual: number;
  concluido: boolean;
}

// Posição que o cliente já tem — só o suficiente pro seletor "ativo que ele
// já tem" e pra dica de quanto já foi acumulado (ver PosicaoResumo em
// AlocacaoView.tsx/PosicoesAgrupadas.tsx, mesma forma).
interface PosicaoParaObjetivo {
  ativo: string;
  classe: string;
  quantidade: number;
  valor_atual: number;
}

const formatBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const formatQuantidade = (v: number) =>
  Number.isInteger(v) ? String(v) : v.toLocaleString("pt-BR", { maximumFractionDigits: 2 });

function normalizarAtivo(ativo: string): string {
  return ativo.trim().toUpperCase();
}

/** Tipo de objetivo sugerido a partir da classe da posição escolhida: Renda
 *  Fixa normalmente tem quantidade=1 (o "custo total" vira o preço médio,
 *  ver lib/movimentacoes.ts) — "quantidade de unidades" não é uma meta útil
 *  ali, então sugere acompanhar por VALOR em vez de quantidade. */
function tipoSugeridoParaClasse(classe: string): "quantidade_ativo" | "valor_ativo" {
  return classe === "Renda Fixa" ? "valor_ativo" : "quantidade_ativo";
}

function descricaoProgresso(o: Objetivo): string {
  if (o.tipo === "quantidade_ativo") {
    return `${formatQuantidade(o.valorAtual)} de ${formatQuantidade(o.meta)} ${o.ativo ?? ""}`;
  }
  if (o.tipo === "valor_ativo") {
    return `${formatBRL(o.valorAtual)} de ${formatBRL(o.meta)} em ${o.ativo ?? ""}`;
  }
  return `${formatBRL(o.valorAtual)} de ${formatBRL(o.meta)}`;
}

/** Gerencia (consultor) ou mostra (cliente) os objetivos/metas gameficadas
 *  do cliente — mesmo endpoint que o app Android usa
 *  (GET/POST /api/clientes/[id]/objetivos, PATCH/DELETE /api/objetivos/[id]).
 *  Só o consultor cria/edita/exclui; o cliente só acompanha o progresso. */
export default function ObjetivosSection({
  clienteId,
  objetivosIniciais,
  podeEditar = false,
  posicoes = [],
}: {
  clienteId: number;
  objetivosIniciais: Objetivo[];
  podeEditar?: boolean;
  /** Posições atuais do cliente — só usado (opcional) pro seletor "ativo que
   *  ele já tem" no formulário de criação, pra não precisar digitar o
   *  ticker na mão. Sem isso, o campo de ativo continua funcionando normal,
   *  só digitado. */
  posicoes?: PosicaoParaObjetivo[];
}) {
  const { mostrarToast } = useToast();
  const [objetivos, setObjetivos] = useState(objetivosIniciais);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  // Form de criação
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [tipo, setTipo] = useState<TipoObjetivo>("quantidade_ativo");
  const [ativo, setAtivo] = useState("");
  const [metaQuantidade, setMetaQuantidade] = useState("");
  const [metaValor, setMetaValor] = useState("");
  const [enviando, setEnviando] = useState(false);

  // Posições ordenadas por valor (maior primeiro) pro seletor "ativo que
  // ele já tem", e a posição que bate com o que está digitado no campo
  // `ativo` agora — pra mostrar "ele já tem X disso" e pra continuar
  // funcionando mesmo se o consultor digitar o ticker na mão em vez de usar
  // o seletor (a dica aparece de qualquer jeito, contanto que o ticker
  // bata com alguma posição real).
  const posicoesOrdenadas = useMemo(
    () => [...posicoes].sort((a, b) => b.valor_atual - a.valor_atual),
    [posicoes]
  );
  const posicaoDoAtivoDigitado = useMemo(
    () => posicoes.find((p) => normalizarAtivo(p.ativo) === normalizarAtivo(ativo)),
    [posicoes, ativo]
  );

  function selecionarPosicaoExistente(ticker: string) {
    const posicao = posicoes.find((p) => p.ativo === ticker);
    if (!posicao) return;
    setAtivo(posicao.ativo);
    setTipo(tipoSugeridoParaClasse(posicao.classe));
  }

  // Form de edição (reaproveita os mesmos campos, um objetivo por vez)
  const [edTitulo, setEdTitulo] = useState("");
  const [edDescricao, setEdDescricao] = useState("");
  const [edAtivo, setEdAtivo] = useState("");
  const [edMetaQuantidade, setEdMetaQuantidade] = useState("");
  const [edMetaValor, setEdMetaValor] = useState("");
  const [edProgressoManual, setEdProgressoManual] = useState("");
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);

  function iniciarEdicao(o: Objetivo) {
    setEditandoId(o.id);
    setEdTitulo(o.titulo);
    setEdDescricao(o.descricao ?? "");
    setEdAtivo(o.ativo ?? "");
    setEdMetaQuantidade(o.meta_quantidade != null ? String(o.meta_quantidade) : "");
    setEdMetaValor(o.meta_valor != null ? String(o.meta_valor) : "");
    setEdProgressoManual(String(o.progresso_manual));
    setErro(null);
  }

  async function criar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (!titulo.trim()) {
      setErro("Preencha o título.");
      return;
    }
    const body: Record<string, unknown> = {
      titulo: titulo.trim(),
      descricao: descricao.trim() || undefined,
      tipo,
    };
    if (tipo === "quantidade_ativo") {
      const qtd = Number(metaQuantidade.replace(",", "."));
      if (!ativo.trim() || !Number.isFinite(qtd) || qtd <= 0) {
        setErro("Preencha o ativo e uma meta de quantidade válida.");
        return;
      }
      body.ativo = ativo.trim().toUpperCase();
      body.meta_quantidade = qtd;
    } else if (tipo === "valor_ativo") {
      const valor = Number(metaValor.replace(",", "."));
      if (!ativo.trim() || !Number.isFinite(valor) || valor <= 0) {
        setErro("Preencha o ativo e uma meta de valor válida.");
        return;
      }
      body.ativo = ativo.trim().toUpperCase();
      body.meta_valor = valor;
    } else {
      const valor = Number(metaValor.replace(",", "."));
      if (!Number.isFinite(valor) || valor <= 0) {
        setErro("Preencha uma meta de valor válida.");
        return;
      }
      body.meta_valor = valor;
    }
    setEnviando(true);
    try {
      const res = await fetch(`/api/clientes/${clienteId}/objetivos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const respData = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErro(respData.erro ?? "Não foi possível criar o objetivo.");
        return;
      }
      // Mais simples e seguro do que montar o objeto na mão (o progresso
      // calculado — valorAtual/meta/percentual — vem só do backend): busca a
      // lista atualizada depois de criar.
      const listaRes = await fetch(`/api/clientes/${clienteId}/objetivos`);
      const listaData = await listaRes.json().catch(() => ({ objetivos: [] }));
      setObjetivos(listaData.objetivos ?? []);
      setTitulo("");
      setDescricao("");
      setAtivo("");
      setMetaQuantidade("");
      setMetaValor("");
      setMostrarForm(false);
      mostrarToast("Objetivo criado!");
    } catch {
      setErro("Erro de conexão. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  }

  async function salvarEdicao(id: number) {
    setErro(null);
    const objetivoAtual = objetivos.find((o) => o.id === id);
    if (!objetivoAtual) return;
    const body: Record<string, unknown> = {
      titulo: edTitulo.trim(),
      descricao: edDescricao.trim() || null,
    };
    if (objetivoAtual.tipo === "quantidade_ativo") {
      const qtd = Number(edMetaQuantidade.replace(",", "."));
      if (!edAtivo.trim() || !Number.isFinite(qtd) || qtd <= 0) {
        setErro("Preencha o ativo e uma meta de quantidade válida.");
        return;
      }
      body.ativo = edAtivo.trim().toUpperCase();
      body.meta_quantidade = qtd;
    } else if (objetivoAtual.tipo === "valor_ativo") {
      const valor = Number(edMetaValor.replace(",", "."));
      if (!edAtivo.trim() || !Number.isFinite(valor) || valor <= 0) {
        setErro("Preencha o ativo e uma meta de valor válida.");
        return;
      }
      body.ativo = edAtivo.trim().toUpperCase();
      body.meta_valor = valor;
    } else {
      const valor = Number(edMetaValor.replace(",", "."));
      if (!Number.isFinite(valor) || valor <= 0) {
        setErro("Preencha uma meta de valor válida.");
        return;
      }
      body.meta_valor = valor;
      const progresso = Number(edProgressoManual.replace(",", "."));
      body.progresso_manual = Number.isFinite(progresso) && progresso >= 0 ? progresso : 0;
    }
    setSalvandoEdicao(true);
    try {
      const res = await fetch(`/api/objetivos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const respData = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErro(respData.erro ?? "Não foi possível salvar.");
        return;
      }
      setObjetivos((prev) => prev.map((o) => (o.id === id ? respData.objetivo : o)));
      setEditandoId(null);
      mostrarToast("Objetivo atualizado!");
    } catch {
      setErro("Erro de conexão. Tente novamente.");
    } finally {
      setSalvandoEdicao(false);
    }
  }

  async function excluir(id: number) {
    const anterior = objetivos;
    setObjetivos((prev) => prev.filter((o) => o.id !== id));
    try {
      const res = await fetch(`/api/objetivos/${id}`, { method: "DELETE" });
      if (!res.ok) {
        setObjetivos(anterior);
        mostrarToast("Não foi possível excluir — tente de novo.", "erro");
      }
    } catch {
      setObjetivos(anterior);
      mostrarToast("Erro de conexão. Tente de novo.", "erro");
    }
  }

  return (
    <section className="rounded-3xl card-sheen p-4 shadow-[var(--shadow-card)] ring-1 ring-slate-900/5 dark:ring-white/10">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">🎯 Objetivos</h2>
        {podeEditar && (
          <button
            type="button"
            onClick={() => setMostrarForm((v) => !v)}
            className="rounded-xl border border-slate-200 dark:border-white/10 px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300"
          >
            {mostrarForm ? "Cancelar" : "+ Novo objetivo"}
          </button>
        )}
      </div>

      {erro && (
        <p className="mb-3 rounded-xl bg-red-50 dark:bg-red-500/10 px-3 py-2 text-xs text-red-700 dark:text-red-400">{erro}</p>
      )}

      {mostrarForm && podeEditar && (
        <form onSubmit={criar} className="mb-4 space-y-2 rounded-xl bg-slate-50 dark:bg-white/5 p-3">
          <input
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Título (ex: Acumular BBAS3)"
            className="w-full rounded-xl border border-slate-200 dark:border-white/10 px-2 py-1.5 text-xs"
          />
          <input
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder="Descrição (opcional)"
            className="w-full rounded-xl border border-slate-200 dark:border-white/10 px-2 py-1.5 text-xs"
          />
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value as TipoObjetivo)}
            className="w-full rounded-xl border border-slate-200 dark:border-white/10 px-2 py-1.5 text-xs"
          >
            <option value="quantidade_ativo">Acumular quantidade de um ativo</option>
            <option value="valor_ativo">Acumular valor (R$) em um ativo (ex: Renda Fixa)</option>
            <option value="valor_livre">Meta de valor (livre)</option>
          </select>
          <p className="text-[11px] text-slate-400 dark:text-slate-500">
            {tipo !== "valor_livre"
              ? "O progresso é automático: atualiza sozinho com a posição real do cliente nesse ativo, sem precisar mexer depois."
              : "Meta livre: o progresso não vem de uma posição específica, então você atualiza o valor atual manualmente quando quiser."}
          </p>
          {tipo !== "valor_livre" && posicoesOrdenadas.length > 0 && (
            <select
              value=""
              onChange={(e) => e.target.value && selecionarPosicaoExistente(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-white/10 px-2 py-1.5 text-xs text-slate-500 dark:text-slate-400"
            >
              <option value="">Selecionar um ativo que o cliente já tem...</option>
              {posicoesOrdenadas.map((p) => (
                <option key={p.ativo} value={p.ativo}>
                  {p.ativo} — {p.classe} ({formatBRL(p.valor_atual)})
                </option>
              ))}
            </select>
          )}
          {tipo === "quantidade_ativo" ? (
            <div className="grid grid-cols-2 gap-2">
              <input
                value={ativo}
                onChange={(e) => setAtivo(e.target.value)}
                placeholder="Ativo (ex: BBAS3)"
                className="rounded-xl border border-slate-200 dark:border-white/10 px-2 py-1.5 text-xs uppercase"
              />
              <input
                value={metaQuantidade}
                onChange={(e) => setMetaQuantidade(e.target.value)}
                placeholder="Meta (quantidade)"
                inputMode="decimal"
                className="rounded-xl border border-slate-200 dark:border-white/10 px-2 py-1.5 text-xs"
              />
            </div>
          ) : tipo === "valor_ativo" ? (
            <div className="grid grid-cols-2 gap-2">
              <input
                value={ativo}
                onChange={(e) => setAtivo(e.target.value)}
                placeholder="Ativo (ex: CDB Banco X)"
                className="rounded-xl border border-slate-200 dark:border-white/10 px-2 py-1.5 text-xs uppercase"
              />
              <input
                value={metaValor}
                onChange={(e) => setMetaValor(e.target.value)}
                placeholder="Meta (R$)"
                inputMode="decimal"
                className="rounded-xl border border-slate-200 dark:border-white/10 px-2 py-1.5 text-xs"
              />
            </div>
          ) : (
            <input
              value={metaValor}
              onChange={(e) => setMetaValor(e.target.value)}
              placeholder="Meta (R$)"
              inputMode="decimal"
              className="w-full rounded-xl border border-slate-200 dark:border-white/10 px-2 py-1.5 text-xs"
            />
          )}
          {tipo !== "valor_livre" && posicaoDoAtivoDigitado && (
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400">
              {tipo === "quantidade_ativo"
                ? `O cliente já tem ${formatQuantidade(posicaoDoAtivoDigitado.quantidade)} unidades desse ativo.`
                : `O cliente já tem ${formatBRL(posicaoDoAtivoDigitado.valor_atual)} investidos nesse ativo.`}
            </p>
          )}
          <button
            type="submit"
            disabled={enviando}
            className="w-full rounded-xl btn-accent px-2 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
          >
            {enviando ? "Criando..." : "Criar objetivo"}
          </button>
        </form>
      )}

      {objetivos.length === 0 ? (
        <p className="text-sm text-slate-400 dark:text-slate-500">
          {podeEditar
            ? 'Nenhum objetivo traçado ainda. Use "+ Novo objetivo" pra criar a primeira meta com esse cliente.'
            : "Seu consultor ainda não traçou nenhum objetivo com você."}
        </p>
      ) : (
        <ul className="space-y-3">
          {objetivos.map((o) => (
            <li key={o.id} className="rounded-xl border border-slate-100 dark:border-white/5 p-3">
              {editandoId === o.id ? (
                <div className="space-y-2">
                  <input
                    value={edTitulo}
                    onChange={(e) => setEdTitulo(e.target.value)}
                    placeholder="Título"
                    className="w-full rounded-xl border border-slate-200 dark:border-white/10 px-2 py-1.5 text-xs"
                  />
                  <input
                    value={edDescricao}
                    onChange={(e) => setEdDescricao(e.target.value)}
                    placeholder="Descrição (opcional)"
                    className="w-full rounded-xl border border-slate-200 dark:border-white/10 px-2 py-1.5 text-xs"
                  />
                  <p className="text-[11px] text-slate-400 dark:text-slate-500">
                    {o.tipo !== "valor_livre"
                      ? "Progresso automático — atualiza sozinho com a posição real do cliente nesse ativo."
                      : "Meta livre — o progresso atual abaixo é atualizado manualmente."}
                  </p>
                  {o.tipo === "quantidade_ativo" ? (
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        value={edAtivo}
                        onChange={(e) => setEdAtivo(e.target.value)}
                        placeholder="Ativo"
                        className="rounded-xl border border-slate-200 dark:border-white/10 px-2 py-1.5 text-xs uppercase"
                      />
                      <input
                        value={edMetaQuantidade}
                        onChange={(e) => setEdMetaQuantidade(e.target.value)}
                        placeholder="Meta (quantidade)"
                        inputMode="decimal"
                        className="rounded-xl border border-slate-200 dark:border-white/10 px-2 py-1.5 text-xs"
                      />
                    </div>
                  ) : o.tipo === "valor_ativo" ? (
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        value={edAtivo}
                        onChange={(e) => setEdAtivo(e.target.value)}
                        placeholder="Ativo"
                        className="rounded-xl border border-slate-200 dark:border-white/10 px-2 py-1.5 text-xs uppercase"
                      />
                      <input
                        value={edMetaValor}
                        onChange={(e) => setEdMetaValor(e.target.value)}
                        placeholder="Meta (R$)"
                        inputMode="decimal"
                        className="rounded-xl border border-slate-200 dark:border-white/10 px-2 py-1.5 text-xs"
                      />
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        value={edMetaValor}
                        onChange={(e) => setEdMetaValor(e.target.value)}
                        placeholder="Meta (R$)"
                        inputMode="decimal"
                        className="rounded-xl border border-slate-200 dark:border-white/10 px-2 py-1.5 text-xs"
                      />
                      <input
                        value={edProgressoManual}
                        onChange={(e) => setEdProgressoManual(e.target.value)}
                        placeholder="Progresso atual (R$)"
                        inputMode="decimal"
                        className="rounded-xl border border-slate-200 dark:border-white/10 px-2 py-1.5 text-xs"
                      />
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => salvarEdicao(o.id)}
                      disabled={salvandoEdicao}
                      className="rounded-xl btn-accent px-2.5 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                    >
                      {salvandoEdicao ? "Salvando..." : "Salvar"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditandoId(null)}
                      className="rounded-xl border border-slate-200 dark:border-white/10 px-2.5 py-1.5 text-xs text-slate-600 dark:text-slate-300"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="flex items-center gap-1 text-sm font-medium text-slate-800 dark:text-slate-100">
                        {o.concluido && <span title="Concluído">🏆</span>}
                        {o.titulo}
                      </p>
                      {o.descricao && (
                        <p className="text-xs text-slate-500 dark:text-slate-400">{o.descricao}</p>
                      )}
                    </div>
                    {podeEditar && (
                      <div className="flex shrink-0 gap-2 text-xs">
                        <button
                          type="button"
                          onClick={() => iniciarEdicao(o)}
                          className="text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => excluir(o.id)}
                          className="text-slate-300 dark:text-slate-600 hover:text-red-500"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                    <div
                      className={`h-2 rounded-full transition-[width] duration-700 ease-out ${
                        o.concluido ? "bg-emerald-500" : "bg-emerald-400"
                      }`}
                      style={{ width: `${Math.min(100, Math.max(0, o.progressoPercentual))}%` }}
                    />
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                    <span>{descricaoProgresso(o)}</span>
                    <span
                      className={o.concluido ? "font-semibold text-emerald-600" : "text-slate-500 dark:text-slate-400"}
                    >
                      {o.progressoPercentual.toFixed(0)}%
                    </span>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
