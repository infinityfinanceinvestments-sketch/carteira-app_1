import { describe, expect, it } from "vitest";
import { parseTextoAvenue } from "./importarAvenue";

// Texto sintético (dados fictícios) que reproduz a mesma estrutura de tabs
// e quebras de linha que o pdf-parse extrai de um extrato real da Avenue —
// inclusive as variações que tornam o parser não-trivial: a primeira linha
// tem o nome do ativo quebrado em linhas anteriores e "$" nos valores; as
// linhas seguintes têm o nome do ativo na mesma linha dos números e sem "$".
const TEXTO_EXEMPLO = `2601 Bayshore DR.
Suite 1100 - Miami. FL 33133
PAGE \t2 \tOF 7
PORTFOLIO SUMMARY - \tAVENUE ACCOUNT NUMBER: 000000000
DESCRIPTION
SYMBOL/
CUSIP
ACCOUNT
TYPE \tQUANTITY \tPRICE
MARKET
VALUE
EQUITIES / OPTIONS
Fictitious Holding Co. - Class B
FICTB
FIC.B \tC \t4.00436 \t505 \t$ 2,022.20 \t$ 1,836.35 \t10.12% \t24.078%
Example SuperDividend ETF \tESDIV \tC \t77 \t24.905 \t1,917.69 \t1,791.36 \t7.05 \t264 \t22.834%
Sample Exploration Corp \tSMPX \tC \t1 \t143.69 \t143.69 \tN/A \t1.711%
Total Equities \t$ 4,083.58 \t99.983%
Total Cash (Net Portfolio Balance) \t$ 1.39 \t0.017%
TOTAL PRICED PORTFOLIO \t$ 4,084.97
ACCOUNT ACTIVITY - \tAVENUE ACCOUNT NUMBER: 000000000
TRANSACTION \tDATE
ACCOUNT
TYPE \tDESCRIPTION \tQUANTITY \tPRICE \tDEBIT \tCREDIT
BOUGHT \t06/08/2026 \tC \tDébito compra de ativo
FIC.B
3 \t22.61 \t$ 67.83
Total Buy / Sell Transactions \t$ 67.83`;

describe("parseTextoAvenue", () => {
  it("reconhece as posições da seção PORTFOLIO SUMMARY", () => {
    const resultado = parseTextoAvenue(TEXTO_EXEMPLO);
    expect(resultado.linhas).toHaveLength(3);

    const ficticia = resultado.linhas.find((l) => l.ativo === "FIC.B");
    expect(ficticia).toBeDefined();
    expect(ficticia?.quantidade).toBeCloseTo(4.00436);
    expect(ficticia?.preco_medio).toBeCloseTo(505);
    expect(ficticia?.valor_atual).toBeCloseTo(2022.2);
    expect(ficticia?.classe).toBe("Ações");

    const etf = resultado.linhas.find((l) => l.ativo === "ESDIV");
    expect(etf).toBeDefined();
    expect(etf?.quantidade).toBeCloseTo(77);
    expect(etf?.preco_medio).toBeCloseTo(24.905);
    expect(etf?.valor_atual).toBeCloseTo(1917.69);
    // Classificado como ETF porque "ETF" aparece no nome do ativo.
    expect(etf?.classe).toBe("ETFs");

    const outra = resultado.linhas.find((l) => l.ativo === "SMPX");
    expect(outra).toBeDefined();
    expect(outra?.quantidade).toBeCloseTo(1);
    expect(outra?.preco_medio).toBeCloseTo(143.69);
    expect(outra?.valor_atual).toBeCloseTo(143.69);
    // Vem logo depois do ETF no extrato — não pode "herdar" a classificação
    // da linha anterior (regressão: o contexto de classificação vazava
    // entre linhas consecutivas).
    expect(outra?.classe).toBe("Ações");
  });

  it("ignora as linhas de totais e a seção de transações", () => {
    const resultado = parseTextoAvenue(TEXTO_EXEMPLO);
    expect(resultado.linhas.some((l) => l.ativo.includes("Total"))).toBe(false);
    // A linha de "BOUGHT" na seção ACCOUNT ACTIVITY não deve virar posição.
    expect(resultado.linhas.some((l) => l.quantidade === 3 && l.preco_medio === 22.61)).toBe(
      false
    );
  });

  it("avisa quando não reconhece nenhuma posição", () => {
    const resultado = parseTextoAvenue("PORTFOLIO SUMMARY -\nnada aqui\nACCOUNT ACTIVITY -");
    expect(resultado.linhas).toHaveLength(0);
    expect(resultado.avisos.length).toBeGreaterThan(0);
  });
});
