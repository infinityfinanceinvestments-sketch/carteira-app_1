import { NextRequest, NextResponse } from "next/server";
import { getSessaoFromRequest } from "@/lib/auth";
import { getAceiteTermos } from "@/lib/repo";
import { VERSAO_TERMOS, TITULO_TERMOS, TEXTO_TERMOS } from "@/lib/termos";

// GET /api/termos — devolve o texto atual e se o usuário logado já aceitou
// essa versão (pra web/Android decidirem se precisam mostrar a tela de
// aceite antes de liberar o resto do app).
export async function GET(req: NextRequest) {
  const sessao = await getSessaoFromRequest(req);
  const aceito = sessao ? Boolean(getAceiteTermos(sessao.userId, VERSAO_TERMOS)) : false;

  return NextResponse.json({
    versao: VERSAO_TERMOS,
    titulo: TITULO_TERMOS,
    texto: TEXTO_TERMOS,
    aceito,
  });
}
