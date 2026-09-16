"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "./Toast";
import { CLASSES_ATIVO } from "@/lib/types";

const EXEMPLO_CSV = `ativo,classe,quantidade,preco_medio,valor_atual
TESOURO SELIC 2029,Renda Fixa,10,1050.00,10800.00
PETR4,Ações,200,28.50,31.20
FII HGLG11,FIIs,50,160.00,172.30`;

type Modo = "csv" | "b3" | "avenue" | "manual";

export default function ImportarForm({
  clientes,
  clienteIdInicial,
}: {
  clientes: { id: number; nome: string }[];
  clienteIdInicial?: number;
}) {
  const router = useRouter();
  const [modo, setModo] = useState<Modo>("b3");
  const [clienteId, setClienteId] = useState<string>(
    clienteIdInicial ? String(clienteIdInicial) : clientes[0]?.id ? String(clientes[0].id) : ""
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 rounded-xl bg-slate-100 dark:bg-white/10 p-1 text-sm">
        <button
          type="button"
          onClick={() => setModo("b3")}
          className={`flex-1 rounded-md px-3 py-1.5 font-medium transition ${
            modo === "b3" ? "bg-white dark:bg-[var(--color-navy-900)] text-black dark:text-white shadow-sm" : "text-slate-500 dark:text-slate-400"
          }`}
        >
          Extrato do Portal do Investidor (B3)
        </button>
        <button
          type="button"
          onClick={() => setModo("avenue")}
          className={`flex-1 rounded-md px-3 py-1.5 font-medium transition ${
            modo === "avenue" ? "bg-white dark:bg-[var(--color-navy-900)] text-black dark:text-white shadow-sm" : "text-slate-500 dark:text-slate-400"
          }`}
        >
          Extrato da Avenue
        </button>
        <button
          type="button"
          onClick={() => setModo("csv")}
          className={`flex-1 rounded-md px-3 py-1.5 font-medium transition ${
            modo === "csv" ? "bg-white dark:bg-[var(--color-navy-900)] text-black dark:text-white shadow-sm" : "text-slate-500 dark:text-slate-400"
          }`}
        >
          CSV simples
        </button>
        <button
          type="button"
          onClick={() => setModo("manual")}
          className={`flex-1 rounded-md px-3 py-1.5 font-medium transition ${
            modo === "manual" ? "bg-white dark:bg-[var(--color-navy-900)] text-black dark:text-white shadow-sm" : "text-slate-500 dark:text-slate-400"
          }`}
        >
          Adicionar 1 ativo
        </button>
      </div>

      <label className="block">
        <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Cliente</span>
        <select
          value={clienteId}
          onChange={(e) => setClienteId(e.target.value)}
          className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[var(--color-navy-900)] px-3 py-2 text-sm"
        >
          {clientes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </select>
      </label>

      {modo === "b3" ? (
        <ImportarB3 clienteId={clienteId} aoImportar={() => router.refresh()} />
      ) : modo === "avenue" ? (
        <ImportarAvenue clienteId={clienteId} aoImportar={() => router.refresh()} />
      ) : modo === "csv" ? (
        <ImportarCsv clienteId={clienteId} aoImportar={() => router.refresh()} />
      ) : (
        <AdicionarManual clienteId={clienteId} aoImportar={() => router.refresh()} />
      )}
    </div>
  );
}

function ImportarB3({ clienteId, aoImportar }: { clienteId: string; aoImportar: () => void }) {
  const { mostrarToast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [resultado, setResultado] = useState<{ importadas: number; avisos: string[] } | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setResultado(null);
    if (!clienteId) {
      setErro("Selecione um cliente.");
      return;
    }
    if (!arquivo) {
      setErro("Selecione o arquivo .xlsx exportado do Portal do Investidor.");
      return;
    }
    setCarregando(true);
    try {
      const formData = new FormData();
      formData.set("arquivo", arquivo);
      const res = await fetch(`/api/clientes/${clienteId}/posicoes/importar-b3`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        setErro(data.erro ?? "Não foi possível importar.");
        if (data.avisos) setResultado({ importadas: 0, avisos: data.avisos });
        return;
      }
      setResultado({ importadas: data.importadas, avisos: data.avisos ?? [] });
      setArquivo(null);
      if (fileRef.current) fileRef.current.value = "";
      mostrarToast(`${data.importadas} posição(ões) importada(s)!`);
      aoImportar();
    } catch {
      setErro("Erro de conexão. Tente novamente.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-3 rounded-3xl card-sheen p-4 shadow-[var(--shadow-card)] ring-1 ring-slate-900/5 dark:ring-white/10">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          No site da B3, entre em <strong>Área do Investidor → Extrato</strong>,
          exporte em Excel (.xlsx) e carregue o arquivo aqui — o app reconhece
          as abas de Ações, BDR, ETF, Fundos, Renda Fixa e Empréstimos
          automaticamente e já lança as posições do cliente selecionado.
        </p>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
            Arquivo do extrato (.xlsx)
          </span>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx"
            onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
            className="w-full text-sm"
          />
        </label>
        <p className="text-[11px] text-slate-400 dark:text-slate-500">
          A B3 não exporta o preço médio de compra original, só a cotação do
          dia — a rentabilidade de cada posição vai refletir a partir de
          agora até você ajustar o preço médio real, se quiser. Reimportar
          substitui as posições importadas dessa forma anteriormente (não
          duplica).
        </p>
      </div>

      {erro && <p className="rounded-xl bg-red-50 dark:bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-400">{erro}</p>}

      {resultado && (
        <div className="rounded-xl bg-emerald-50 dark:bg-emerald-500/10 px-3 py-2 text-sm text-emerald-800 dark:text-emerald-300">
          <p>{resultado.importadas} posição(ões) importada(s) com sucesso.</p>
          {resultado.avisos.length > 0 && (
            <ul className="mt-1 list-disc pl-4 text-xs text-amber-700 dark:text-amber-400">
              {resultado.avisos.map((a, i) => (
                <li key={i}>{a}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <button
        type="submit"
        disabled={carregando || !arquivo}
        className="w-full rounded-xl btn-accent px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
      >
        {carregando ? "Importando..." : "Importar extrato da B3"}
      </button>
    </form>
  );
}

function ImportarAvenue({ clienteId, aoImportar }: { clienteId: string; aoImportar: () => void }) {
  const { mostrarToast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [resultado, setResultado] = useState<{ importadas: number; avisos: string[] } | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setResultado(null);
    if (!clienteId) {
      setErro("Selecione um cliente.");
      return;
    }
    if (!arquivo) {
      setErro("Selecione o extrato em PDF baixado da Avenue.");
      return;
    }
    setCarregando(true);
    try {
      const formData = new FormData();
      formData.set("arquivo", arquivo);
      const res = await fetch(`/api/clientes/${clienteId}/posicoes/importar-avenue`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        setErro(data.erro ?? "Não foi possível importar.");
        if (data.avisos) setResultado({ importadas: 0, avisos: data.avisos });
        return;
      }
      setResultado({ importadas: data.importadas, avisos: data.avisos ?? [] });
      setArquivo(null);
      if (fileRef.current) fileRef.current.value = "";
      mostrarToast(`${data.importadas} posição(ões) importada(s)!`);
      aoImportar();
    } catch {
      setErro("Erro de conexão. Tente novamente.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-3 rounded-3xl card-sheen p-4 shadow-[var(--shadow-card)] ring-1 ring-slate-900/5 dark:ring-white/10">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          No site ou app da Avenue, baixe o extrato mensal (“Account
          Statement”) em PDF e carregue o arquivo aqui — o app reconhece a
          tabela “Portfolio Summary” automaticamente e já lança as posições
          (ações e ETFs internacionais) do cliente selecionado.
        </p>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
            Extrato mensal da Avenue (.pdf)
          </span>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf"
            onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
            className="w-full text-sm"
          />
        </label>
        <p className="text-[11px] text-slate-400 dark:text-slate-500">
          Assim como no extrato da B3, esse PDF não traz o preço médio de
          compra original, só a cotação do dia — a rentabilidade de cada
          posição vai refletir a partir de agora até você ajustar o preço
          médio real, se quiser. A classe do ativo (Ações/ETFs) é um
          palpite — confira depois de importar. Reimportar substitui as
          posições importadas dessa forma anteriormente (não duplica).
        </p>
      </div>

      {erro && <p className="rounded-xl bg-red-50 dark:bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-400">{erro}</p>}

      {resultado && (
        <div className="rounded-xl bg-emerald-50 dark:bg-emerald-500/10 px-3 py-2 text-sm text-emerald-800 dark:text-emerald-300">
          <p>{resultado.importadas} posição(ões) importada(s) com sucesso.</p>
          {resultado.avisos.length > 0 && (
            <ul className="mt-1 list-disc pl-4 text-xs text-amber-700 dark:text-amber-400">
              {resultado.avisos.map((a, i) => (
                <li key={i}>{a}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <button
        type="submit"
        disabled={carregando || !arquivo}
        className="w-full rounded-xl btn-accent px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
      >
        {carregando ? "Importando..." : "Importar extrato da Avenue"}
      </button>
    </form>
  );
}

function ImportarCsv({ clienteId, aoImportar }: { clienteId: string; aoImportar: () => void }) {
  const { mostrarToast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [instituicao, setInstituicao] = useState("");
  const [csv, setCsv] = useState("");
  const [resultado, setResultado] = useState<{ importadas: number; erros: string[] } | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  function onArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setCsv(String(reader.result ?? ""));
    reader.readAsText(file);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setResultado(null);
    if (!clienteId) {
      setErro("Selecione um cliente.");
      return;
    }
    setCarregando(true);
    try {
      const res = await fetch(`/api/clientes/${clienteId}/posicoes/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instituicao: instituicao || "Manual", csv }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErro(data.erro ?? "Não foi possível importar.");
        if (data.erros) setResultado({ importadas: 0, erros: data.erros });
        return;
      }
      setResultado({ importadas: data.importadas, erros: data.erros ?? [] });
      setCsv("");
      if (fileRef.current) fileRef.current.value = "";
      mostrarToast(`${data.importadas} posição(ões) importada(s)!`);
      aoImportar();
    } catch {
      setErro("Erro de conexão. Tente novamente.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-3 rounded-3xl card-sheen p-4 shadow-[var(--shadow-card)] ring-1 ring-slate-900/5 dark:ring-white/10">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
            Instituição/corretora de origem
          </span>
          <input
            value={instituicao}
            onChange={(e) => setInstituicao(e.target.value)}
            placeholder="Ex: XP, BTG, Itaú..."
            className="w-full rounded-xl border border-slate-200 dark:border-white/10 px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
            Arquivo CSV de posições
          </span>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            onChange={onArquivo}
            className="w-full text-sm"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
            Ou cole o conteúdo do CSV
          </span>
          <textarea
            value={csv}
            onChange={(e) => setCsv(e.target.value)}
            rows={6}
            placeholder={EXEMPLO_CSV}
            className="w-full rounded-xl border border-slate-200 dark:border-white/10 px-3 py-2 font-mono text-xs"
          />
        </label>
        <p className="text-[11px] text-slate-400 dark:text-slate-500">
          Colunas esperadas: ativo, classe, quantidade, preço médio, valor atual.
          Classes válidas: Renda Fixa, Ações, Fundos, FIIs, ETFs, Moeda Estrangeira,
          Cripto. Reimportar pra essa mesma instituição substitui as posições
          lançadas anteriormente por ela (não duplica).
        </p>
      </div>

      {erro && <p className="rounded-xl bg-red-50 dark:bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-400">{erro}</p>}

      {resultado && (
        <div className="rounded-xl bg-emerald-50 dark:bg-emerald-500/10 px-3 py-2 text-sm text-emerald-800 dark:text-emerald-300">
          <p>{resultado.importadas} posição(ões) importada(s) com sucesso.</p>
          {resultado.erros.length > 0 && (
            <ul className="mt-1 list-disc pl-4 text-xs text-amber-700 dark:text-amber-400">
              {resultado.erros.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <button
        type="submit"
        disabled={carregando || !csv.trim()}
        className="w-full rounded-xl btn-accent px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
      >
        {carregando ? "Importando..." : "Importar posições"}
      </button>
    </form>
  );
}

const CAMPOS_INICIAIS = {
  ativo: "",
  classe: CLASSES_ATIVO[0] as string,
  quantidade: "",
  preco_medio: "",
  preco_atual: "",
};

function AdicionarManual({ clienteId, aoImportar }: { clienteId: string; aoImportar: () => void }) {
  const { mostrarToast } = useToast();
  const [campos, setCampos] = useState(CAMPOS_INICIAIS);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  function atualizarCampo(campo: keyof typeof CAMPOS_INICIAIS, valor: string) {
    setCampos((c) => ({ ...c, [campo]: valor }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (!clienteId) {
      setErro("Selecione um cliente.");
      return;
    }
    const quantidade = Number(campos.quantidade.replace(",", "."));
    const preco_medio = Number(campos.preco_medio.replace(",", "."));
    const preco_atual = Number(campos.preco_atual.replace(",", "."));
    if (!campos.ativo.trim()) {
      setErro("Informe o nome/código do ativo.");
      return;
    }
    if (!Number.isFinite(quantidade) || quantidade <= 0) {
      setErro("Quantidade inválida.");
      return;
    }
    if (!Number.isFinite(preco_medio) || preco_medio < 0) {
      setErro("Preço médio inválido.");
      return;
    }
    if (!Number.isFinite(preco_atual) || preco_atual < 0) {
      setErro("Preço atual inválido.");
      return;
    }
    setCarregando(true);
    try {
      const res = await fetch(`/api/clientes/${clienteId}/posicoes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ativo: campos.ativo.trim(),
          classe: campos.classe,
          quantidade,
          preco_medio,
          preco_atual,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErro(data.erro ?? "Não foi possível adicionar o ativo.");
        return;
      }
      mostrarToast("Ativo adicionado à carteira!");
      setCampos(CAMPOS_INICIAIS);
      aoImportar();
    } catch {
      setErro("Erro de conexão. Tente novamente.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-3 rounded-3xl card-sheen p-4 shadow-[var(--shadow-card)] ring-1 ring-slate-900/5 dark:ring-white/10">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Lança um ativo direto na carteira do cliente, somando ao que ele já
          tem — ideal pra ativos que a importação da B3 não cobre, como ações
          e ETFs internacionais ou posições em corretoras estrangeiras.
        </p>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
            Ativo
          </span>
          <input
            value={campos.ativo}
            onChange={(e) => atualizarCampo("ativo", e.target.value)}
            placeholder="Ex: AAPL, VOO, VWCE..."
            className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[var(--color-navy-900)] px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
            Classe
          </span>
          <select
            value={campos.classe}
            onChange={(e) => atualizarCampo("classe", e.target.value)}
            className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[var(--color-navy-900)] px-3 py-2 text-sm"
          >
            {CLASSES_ATIVO.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
              Quantidade
            </span>
            <input
              inputMode="decimal"
              value={campos.quantidade}
              onChange={(e) => atualizarCampo("quantidade", e.target.value)}
              placeholder="0"
              className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[var(--color-navy-900)] px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
              Preço médio
            </span>
            <input
              inputMode="decimal"
              value={campos.preco_medio}
              onChange={(e) => atualizarCampo("preco_medio", e.target.value)}
              placeholder="0,00"
              className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[var(--color-navy-900)] px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
              Preço atual
            </span>
            <input
              inputMode="decimal"
              value={campos.preco_atual}
              onChange={(e) => atualizarCampo("preco_atual", e.target.value)}
              placeholder="0,00"
              className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[var(--color-navy-900)] px-3 py-2 text-sm"
            />
          </label>
        </div>
        <p className="text-[11px] text-slate-400 dark:text-slate-500">
          Preço médio e preço atual são por unidade/cota (o app calcula o
          valor total da posição sozinho). Esse lançamento soma às posições
          existentes do cliente — não substitui nada.
        </p>
      </div>

      {erro && <p className="rounded-xl bg-red-50 dark:bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-400">{erro}</p>}

      <button
        type="submit"
        disabled={carregando}
        className="w-full rounded-xl btn-accent px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
      >
        {carregando ? "Adicionando..." : "Adicionar ativo"}
      </button>
    </form>
  );
}
