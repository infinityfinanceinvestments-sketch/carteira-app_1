import { NextRequest, NextResponse } from "next/server";
import { getSessaoFromRequest } from "@/lib/auth";
import { registrarAceiteTermos } from "@/lib/repo";
import { VERSAO_TERMOS } from "@/lib/termos";

export async function POST(req: NextRequest) {
  const sessao = await getSessaoFromRequest(req);
  if (!sessao) {
    return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
  }
  registrarAceiteTermos(sessao.userId, VERSAO_TERMOS);
  return NextResponse.json({ ok: true, versao: VERSAO_TERMOS });
}
