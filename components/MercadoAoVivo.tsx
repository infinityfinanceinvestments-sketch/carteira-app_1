"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { TICKERS_B3 } from "@/lib/tickersB3";

interface CotacaoMercado {
  ticker: string;
  preco: number | null;
  variacaoPercentual: number | null;
  atualizadoEm: string;
  erro?: string;
}

interface PontoCurva {
  vencimento: string;
  taxaCompra: number;
  taxaVenda: number;
  tipo: string;
}

interface CurvasMercado {
  atualizadoEm: string;
  dataBase: string | null;
  prefixada: PontoCurva[];
  ipcaMais: PontoCurva[];
  selic: PontoCurva[];
  erro?: string;
}

const REFRESH_MS = 60_000; // 60s — cotações "ao vivo" sem exagerar nas chamadas

const formatBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const formatData = (iso: string) => {
  const [ano, mes, dia] = iso.split("-");
  if (!ano || !mes || !dia) return iso;
  return `${dia}/${mes}/${ano}`;
};

const formatPercent = (v: number) => `${v > 0 ? "+" : ""}${v.toFixed(2)}%`;

export default function MercadoAoVivo({
  clienteId,
  favoritosIniciais,
}: {
  clienteId: number;
  favoritosIniciais: string[];
}) {
  const [favoritos, setFavoritos] = useState<string[]>(favoritosIniciais);
  const [cotacoes, setCotacoes] = useState<Record<string, CotacaoMercado>>({});
  const [novoTicker, setNovoTicker] = useState("");
  const [adicionando, setAdicionando] = useState(false);
  const [erroAdicionar, setErroAdicionar] = useState<string | null>(null);
  const [carregandoCotacoes, setCarregandoCotacoes] = useState(false);
  const [sugestoesAbertas, setSugestoesAbertas] = useState(false);

  const [curvas, setCurvas] = useState<CurvasMercado | null>(null);
  const [carregandoCurvas, setCarregandoCurvas] = useState(true);

  // Sugestões de autocomplete: filtra a lista estática de tickers da B3
  // pelo que o cliente já digitou, pra ele não precisar digitar o código
  // inteiro. Só sugere ativos que ainda não estão nos favoritos.
  const termoBusca = novoTicker.trim().toUpperCase();
  const sugestoes =
    termoBusca.length === 0
      ? []
      : TICKERS_B3.filter(
          (t) => t.ticker.startsWith(termoBusca) && !favoritos.includes(t.ticker)
        ).slice(0, 6);

  const buscarCotacoes = useCallback(async (tickers: string[]) => {
    if (tickers.length === 0) {
      setCotacoes({});
      return;
    }
    setCarregandoCotacoes(true);
    try {
      const res = await fetch(
        `/api/mercado/cotacoes?tickers=${encodeURIComponent(tickers.join(","))}`
      );
      if (!res.ok) return;
      const data = await res.json();
      const mapa: Record<string, CotacaoMercado> = {};
      for (const c of data.cotacoes as CotacaoMercado[]) mapa[c.ticker] = c;
      setCotacoes(mapa);
    } catch {
      // best effort — mantém as últimas cotações que já tinha na tela
    } finally {
      setCarregandoCotacoes(false);
    }
  }, []);

  const buscarCurvas = useCallback(async () => {
    setCarregandoCurvas(true);
    try {
      const res = await fetch("/api/mercado/curva-juros");
      if (res.ok) setCurvas(await res.json());
    } catch {
      // idem
    } finally {
      setCarregandoCurvas(false);
    }
  }, []);

  // Busca de dados sob demanda (montagem + a cada favorito adicionado/
  // removido), com atualização periódica das cotações enquanto a aba fica
  // aberta — é o padrão normal pra uma tela "ao vivo". O aviso do lint
  // sobre setState em efeito (voltado pro React Compiler) não se aplica
  // a esse tipo de busca de dados externos.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    buscarCotacoes(favoritos);
    const intervalo = setInterval(() => buscarCotacoes(favoritos), REFRESH_MS);
    return () => clearInterval(intervalo);
  }, [favoritos, buscarCotacoes]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    buscarCurvas();
  }, [buscarCurvas]);

  // Recebe o ticker como parâmetro (em vez de ler `novoTicker` do estado)
  // pra funcionar tanto no submit do formulário quanto no clique direto
  // numa sugestão do autocomplete, onde o estado ainda não teria sido
  // atualizado no momento da chamada.
  async function enviarFavorito(tickerBruto: string) {
    setErroAdicionar(null);
    const ticker = tickerBruto.trim().toUpperCase();
    if (!ticker) return;
    if (favoritos.includes(ticker)) {
      setErroAdicionar("Esse ativo já está nos seus favoritos.");
      return;
    }
    setAdicionando(true);
    try {
      const res = await fetch(`/api/clientes/${clienteId}/favoritos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErroAdicionar(data.erro ?? "Não foi possível adicionar.");
        return;
      }
      setFavoritos((prev) => [...prev, ticker]);
      setNovoTicker("");
      setSugestoesAbertas(false);
      // busca a cotação desse ativo específico já de cara, sem esperar o próximo ciclo
      const resCot = await fetch(`/api/mercado/cotacoes?tickers=${ticker}`);
      if (resCot.ok) {
        const data = await resCot.json();
        const cot = (data.cotacoes as CotacaoMercado[])[0];
        if (cot) setCotacoes((prev) => ({ ...prev, [ticker]: cot }));
      }
    } catch {
      setErroAdicionar("Erro de conexão. Tente novamente.");
    } finally {
      setAdicionando(false);
    }
  }

  function aoEnviarFormulario(e: React.FormEvent) {
    e.preventDefault();
    enviarFavorito(novoTicker);
  }

  function selecionarSugestao(ticker: string) {
    enviarFavorito(ticker);
  }

  async function removerFavorito(ticker: string) {
    setFavoritos((prev) => prev.filter((t) => t !== ticker));
    setCotacoes((prev) => {
      const resto = { ...prev };
      delete resto[ticker];
      return resto;
    });
    try {
      await fetch(`/api/clientes/${clienteId}/favoritos/${encodeURIComponent(ticker)}`, {
        method: "DELETE",
      });
    } catch {
      // se falhar, o favorito volta a aparecer no próximo carregamento da página
    }
  }

  return (
    <div className="space-y-5">
      <section className="rounded-3xl card-sheen p-4 shadow-[var(--shadow-card)] ring-1 ring-slate-900/5 dark:ring-white/10">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Ativos favoritos</h2>
          {carregandoCotacoes && (
            <span className="text-[11px] text-slate-400 dark:text-slate-500">atualizando…</span>
          )}
        </div>

        <form onSubmit={aoEnviarFormulario} className="mb-3 flex gap-2">
          <div className="relative min-w-0 flex-1">
            <input
              value={novoTicker}
              onChange={(e) => {
                setNovoTicker(e.target.value);
                setSugestoesAbertas(true);
              }}
              onFocus={() => setSugestoesAbertas(true)}
              onBlur={() => setSugestoesAbertas(false)}
              placeholder="Ex: BBAS3"
              maxLength={20}
              autoComplete="off"
              className="w-full rounded-xl border border-slate-200 dark:border-white/10 px-3 py-2 text-sm uppercase"
            />
            {sugestoesAbertas && sugestoes.length > 0 && (
              <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[var(--color-navy-900)] text-left shadow-lg">
                {sugestoes.map((s) => (
                  <li key={s.ticker}>
                    <button
                      type="button"
                      // onMouseDown (não onClick) pra disparar antes do onBlur
                      // do input, que senão fecharia a lista antes do clique
                      // ser registrado.
                      onMouseDown={(e) => {
                        e.preventDefault();
                        selecionarSugestao(s.ticker);
                      }}
                      className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs hover:bg-slate-50 dark:hover:bg-white/5"
                    >
                      <span className="shrink-0 font-semibold text-slate-800 dark:text-slate-100 normal-case">
                        {s.ticker}
                      </span>
                      <span className="truncate text-slate-400 dark:text-slate-500 normal-case">{s.nome}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <button
            type="submit"
            disabled={adicionando || !novoTicker.trim()}
            className="shrink-0 rounded-xl btn-accent px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {adicionando ? "..." : "Adicionar"}
          </button>
        </form>
        {erroAdicionar && (
          <p className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">
            {erroAdicionar}
          </p>
        )}

        {favoritos.length === 0 ? (
          <p className="text-sm text-slate-400 dark:text-slate-500">
            Você ainda não tem ativos favoritos. Adicione o ticker da B3 (ex:
            BBAS3, BBSE3, PETR4) pra acompanhar a cotação aqui.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-white/10">
            {favoritos.map((ticker) => {
              const cot = cotacoes[ticker];
              const variacao = cot?.variacaoPercentual;
              const cor =
                variacao == null
                  ? "text-slate-400 dark:text-slate-500"
                  : variacao >= 0
                  ? "text-emerald-700"
                  : "text-red-700";
              return (
                <li key={ticker} className="flex items-center justify-between py-2.5">
                  <span className="text-sm font-medium text-slate-800 dark:text-slate-100">{ticker}</span>
                  <div className="flex items-center gap-3">
                    {cot?.erro ? (
                      <span className="text-xs text-slate-400 dark:text-slate-500">indisponível</span>
                    ) : cot?.preco != null ? (
                      <div className="text-right">
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                          {formatBRL(cot.preco)}
                        </p>
                        {variacao != null && (
                          <p className={`text-xs font-medium ${cor}`}>
                            {formatPercent(variacao)} hoje
                          </p>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 dark:text-slate-500">carregando…</span>
                    )}
                    <button
                      onClick={() => removerFavorito(ticker)}
                      aria-label={`Remover ${ticker} dos favoritos`}
                      className="text-slate-300 dark:text-slate-600 hover:text-red-500"
                    >
                      ✕
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <CurvaSection
        titulo="Curva de juros (Tesouro Prefixado)"
        descricao="Taxa anual de cada vencimento prefixado ofertado pelo Tesouro Direto — referência de mercado pra juros nominais."
        pontos={curvas?.prefixada}
        carregando={carregandoCurvas}
        erro={curvas?.erro}
      />

      <CurvaSection
        titulo="NTN-B (Tesouro IPCA+)"
        descricao="Taxa real anual (acima da inflação) de cada vencimento do Tesouro IPCA+."
        pontos={curvas?.ipcaMais}
        carregando={carregandoCurvas}
        erro={curvas?.erro}
      />

      {curvas?.dataBase && (
        <p className="text-center text-[11px] text-slate-400 dark:text-slate-500">
          Taxas do Tesouro Direto referentes a {formatData(curvas.dataBase)}.
          Cotações de ativos com atraso de poucos minutos.
        </p>
      )}
    </div>
  );
}

function rotuloTipo(tipo: string) {
  return tipo.includes("Semestrais") ? "c/ juros semestrais" : "principal";
}

function CurvaSection({
  titulo,
  descricao,
  pontos,
  carregando,
  erro,
}: {
  titulo: string;
  descricao: string;
  pontos?: PontoCurva[];
  carregando: boolean;
  erro?: string;
}) {
  const seletorId = useId();
  // Só mostra 1 vencimento por vez (o mais próximo, já que `pontos` vem
  // ordenado por vencimento) — os outros ficam num menu suspenso pro
  // cliente trocar sem poluir a tela com uma tabela gigante.
  const [indice, setIndice] = useState(0);
  const lista = pontos ?? [];
  const indiceValido = Math.min(indice, Math.max(lista.length - 1, 0));
  const selecionado = lista[indiceValido];

  return (
    <section className="rounded-3xl card-sheen p-4 shadow-[var(--shadow-card)] ring-1 ring-slate-900/5 dark:ring-white/10">
      <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{titulo}</h2>
      <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">{descricao}</p>

      {carregando && !pontos ? (
        <p className="text-sm text-slate-400 dark:text-slate-500">Carregando…</p>
      ) : erro ? (
        <p className="text-sm text-amber-700">{erro}</p>
      ) : !selecionado ? (
        <p className="text-sm text-slate-400 dark:text-slate-500">Sem dados disponíveis no momento.</p>
      ) : (
        <>
          <div className="flex items-center justify-between rounded-xl bg-slate-50 dark:bg-white/5 px-3 py-2.5">
            <div>
              <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                Vencimento {formatData(selecionado.vencimento)}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{rotuloTipo(selecionado.tipo)}</p>
            </div>
            <p className="text-lg font-semibold text-slate-800 dark:text-slate-100">
              {selecionado.taxaCompra.toFixed(2)}% a.a.
            </p>
          </div>

          {lista.length > 1 && (
            <div className="mt-2">
              <label htmlFor={seletorId} className="text-[11px] text-slate-400 dark:text-slate-500">
                Ver outro vencimento
              </label>
              <select
                id={seletorId}
                value={indiceValido}
                onChange={(e) => setIndice(Number(e.target.value))}
                className="mt-1 w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[var(--color-navy-900)] px-2 py-1.5 text-xs text-slate-700 dark:text-slate-200"
              >
                {lista.map((p, i) => (
                  <option key={`${p.vencimento}-${p.tipo}-${i}`} value={i}>
                    {formatData(p.vencimento)} — {p.taxaCompra.toFixed(2)}% a.a. (
                    {rotuloTipo(p.tipo)})
                  </option>
                ))}
              </select>
            </div>
          )}
        </>
      )}
    </section>
  );
}
