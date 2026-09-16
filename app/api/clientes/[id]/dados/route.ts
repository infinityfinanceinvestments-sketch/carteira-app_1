import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessaoFromRequest } from "@/lib/auth";
import {
  getClientePorId,
  getUsuarioPorEmail,
  atualizarNomeEmailUsuario,
  atualizarDadosCliente,
  registrarAuditoria,
} from "@/lib/repo";

// PATCH /api/clientes/[id]/dados — edita os dados cadastrais do cliente
// (aba "Dados do cliente", ver components/EditarClienteForm.tsx). Rota
// separada do PATCH em app/api/clientes/[id]/route.ts (que só mexe em
// carteira_modelo_id) pra não misturar os dois schemas de validação.
const schema = z.object({
  nome: z.string().trim().min(2),
  email: z.string().trim().email(),
  telefone: z.string().trim().min(1).nullable(),
  perfil_risco: z.enum(["conservador", "moderado", "arrojado"]),
  objetivo: z.string().trim().min(1).nullable(),
});

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const sessao = await getSessaoFromRequest(req);
  if (!sessao || sessao.papel !== "consultor") {
    return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
  }
  const { id } = await ctx.params;
  const clienteId = Number(id);
  const cliente = getClientePorId(clienteId);
  if (!cliente) {
    return NextResponse.json({ erro: "Cliente não encontrado." }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { erro: "Preencha nome, e-mail e perfil corretamente.", detalhes: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const dados = parsed.data;
  const emailNovo = dados.email.toLowerCase();

  // usuarios.email é o e-mail de LOGIN do cliente — diferente de
  // clientes.email (só cadastral). Se o consultor está trocando o e-mail,
  // confere que nenhum OUTRO usuário já usa esse endereço antes de gravar
  // (mesma checagem do cadastro em app/api/clientes/route.ts).
  if (emailNovo !== cliente.email.toLowerCase()) {
    const jaExiste = getUsuarioPorEmail(emailNovo);
    if (jaExiste && jaExiste.id !== cliente.usuario_id) {
      return NextResponse.json(
        { erro: "Já existe um usuário com esse e-mail." },
        { status: 409 }
      );
    }
  }

  atualizarNomeEmailUsuario(cliente.usuario_id, dados.nome, emailNovo);
  atualizarDadosCliente(clienteId, {
    nome: dados.nome,
    email: emailNovo,
    telefone: dados.telefone,
    perfil_risco: dados.perfil_risco,
    objetivo: dados.objetivo,
  });

  registrarAuditoria({
    cliente_id: clienteId,
    usuario_id: sessao.userId,
    acao: "cliente_dados_atualizados",
    detalhes: { nome: dados.nome, email: emailNovo },
  });

  return NextResponse.json({ ok: true });
}
