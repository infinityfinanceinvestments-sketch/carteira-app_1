import { NextRequest, NextResponse } from "next/server";
import { getSessaoFromRequest } from "@/lib/auth";
import { buscarCurvaTesouroDireto } from "@/lib/mercado";

// GET /api/mercado/curva-juros — curva prefixada e Tesouro IPCA+ (NTN-B)
export async function GET(req: NextRequest) {
  const sessao = await getSessaoFromRequest(req);
  if (!sessao) {
    return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
  }

  const curvas = await buscarCurvaTesouroDireto();
  return NextResponse.json(curvas);
}
