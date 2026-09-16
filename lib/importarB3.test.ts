import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import { parseExtratoB3 } from "./importarB3";

// Monta um workbook em memória com o mesmo formato do extrato real do
// Portal do Investidor da B3 (cabeçalhos e nomes de aba exatos), mas com
// dados fictícios — mais robusto que fixar um .xlsx de exemplo no repo, e
// evita qualquer dado real de cliente no arquivo de teste.
async function montarWorkbook(abas: Record<string, { cabecalho: string[]; linhas: (string | number)[][] }>) {
  const wb = new ExcelJS.Workbook();
  for (const [nomeAba, { cabecalho, linhas }] of Object.entries(abas)) {
    const aba = wb.addWorksheet(nomeAba);
    aba.addRow(cabecalho);
    for (const linha of linhas) aba.addRow(linha);
  }
  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

describe("parseExtratoB3", () => {
  it("reconhece posições da aba Tesouro Direto (nome completo do título, classe Renda Fixa)", async () => {
    const buffer = await montarWorkbook({
      "Tesouro Direto": {
        cabecalho: [
          "Produto",
          "Instituição",
          "Código ISIN",
          "Indexador",
          "Vencimento",
          "Quantidade",
          "Quantidade Disponível",
          "Quantidade Indisponível",
          "Motivo",
          "Valor Aplicado",
          "Valor bruto",
          "Valor líquido",
          "Valor Atualizado",
        ],
        linhas: [
          [
            "Tesouro IPCA+ 2029",
            "Corretora Exemplo CTVM",
            "BR0000000000",
            "IPCA",
            "15/05/2029",
            3.64,
            3.64,
            0,
            "-",
            12990.03,
            14187.62,
            13930.16,
            14187.62,
          ],
        ],
      },
    });

    const resultado = await parseExtratoB3(buffer);
    expect(resultado.linhas).toHaveLength(1);
    const [linha] = resultado.linhas;
    expect(linha.ativo).toBe("Tesouro IPCA+ 2029");
    expect(linha.classe).toBe("Renda Fixa");
    expect(linha.quantidade).toBeCloseTo(3.64);
    expect(linha.valor_atual).toBeCloseTo(14187.62);
    expect(linha.preco_medio).toBeCloseTo(14187.62 / 3.64);
  });

  it("classifica fundo imobiliário como FIIs mesmo com 'imob' abreviado no nome", async () => {
    const buffer = await montarWorkbook({
      "Fundo de Investimento": {
        cabecalho: [
          "Produto",
          "Instituição",
          "Conta",
          "Código de Negociação",
          "CNPJ do Fundo",
          "Código ISIN / Distribuição",
          "Tipo",
          "Administrador",
          "Quantidade",
          "Quantidade Disponível",
          "Quantidade Indisponível",
          "Motivo",
          "Preço de Fechamento",
          "Valor Atualizado",
        ],
        linhas: [
          [
            "HGLG11 - EXEMPLO LOG - FDO INV IMOB - RESPONSABILIDADE LTDA.",
            "Corretora Exemplo CTVM",
            "00000000",
            "HGLG11",
            "00000000000000",
            "BR0000000000 - 000",
            "Cotas",
            "Administradora Exemplo",
            30,
            30,
            "-",
            "-",
            148.1,
            4443,
          ],
          [
            "AGRO11 - FIAGRO EXEMPLO",
            "Corretora Exemplo CTVM",
            "00000000",
            "AGRO11",
            "00000000000000",
            "BR0000000000 - 000",
            "Cotas",
            "Administradora Exemplo",
            10,
            10,
            "-",
            "-",
            100,
            1000,
          ],
        ],
      },
    });

    const resultado = await parseExtratoB3(buffer);
    const fii = resultado.linhas.find((l) => l.ativo === "HGLG11");
    expect(fii?.classe).toBe("FIIs");
    // Fiagro não é FII — continua caindo em "Fundos".
    const fiagro = resultado.linhas.find((l) => l.ativo === "AGRO11");
    expect(fiagro?.classe).toBe("Fundos");
  });

  it("ignora abas que não reconhece (ex: Opções) sem quebrar o resto do arquivo", async () => {
    const buffer = await montarWorkbook({
      Opções: {
        cabecalho: ["Produto", "Quantidade"],
        linhas: [["Alguma opção", 10]],
      },
      Ações: {
        cabecalho: ["Produto", "Código de Negociação", "Quantidade", "Valor Atualizado"],
        linhas: [["Empresa Exemplo S.A.", "EXPL3", 100, 2500]],
      },
    });

    const resultado = await parseExtratoB3(buffer);
    expect(resultado.linhas).toHaveLength(1);
    expect(resultado.linhas[0].ativo).toBe("EXPL3");
    expect(resultado.avisos.some((a) => a.includes("Opções") && a.includes("não reconhecida"))).toBe(
      true
    );
  });
});
