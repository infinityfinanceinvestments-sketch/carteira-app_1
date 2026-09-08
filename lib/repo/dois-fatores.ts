import { randomBytes, createHash, createHmac } from "node:crypto";
import getDb, { plainRow } from "../db";

const VALIDADE_CODIGO_MS = 10 * 60 * 1000; // 10 minutos
const MAX_TENTATIVAS_CODIGO = 5;
const VALIDADE_DISPOSITIVO_DIAS = 180;

interface CodigoVerificacaoRow {
  id: number;
  usuario_id: number;
  codigo_hash: string;
  tentativas: number;
  usado: number;
  expira_em: string;
  criado_em: string;
}

interface DispositivoConfiavelRow {
  id: number;
  usuario_id: number;
  token_hash: string;
  criado_em: string;
  ultimo_uso_em: string;
}

// HMAC com o AUTH_SECRET (em vez de hash puro) pra que um vazamento só do
// arquivo data.db não seja suficiente pra forjar/validar códigos e tokens de
// dispositivo — precisaria também da chave do app. Exportada (junto com
// gerarCodigoNumerico logo abaixo) só pra dar pra testar essa lógica pura
// isolada, sem precisar abrir o banco — ver dois-fatores.test.ts.
export function hashComSegredo(valor: string): string {
  const segredo = process.env.AUTH_SECRET || "dev-only-secret-troque-em-producao-0123456789";
  return createHmac("sha256", segredo).update(valor).digest("hex");
}

export function gerarCodigoNumerico(): string {
  // 6 dígitos, sem viés de módulo (descarta e sorteia de novo se cair fora
  // da faixa múltipla de 10^6 dentro do espaço de 0..2^32-1).
  const LIMITE = 1_000_000;
  const MAX_VALIDO = Math.floor(0xffffffff / LIMITE) * LIMITE;
  let n: number;
  do {
    n = randomBytes(4).readUInt32BE(0);
  } while (n >= MAX_VALIDO);
  return String(n % LIMITE).padStart(6, "0");
}

/** Cria um novo código de verificação de 6 dígitos pro usuário e devolve o
 *  código em texto puro (só existe na memória pra ser mandado por e-mail —
 *  o banco guarda apenas o hash). Qualquer código anterior ainda pendente
 *  desse usuário é invalidado, pra nunca ter dois válidos ao mesmo tempo. */
export function criarCodigoVerificacao(usuarioId: number): string {
  const db = getDb();
  db.prepare(
    "UPDATE codigos_verificacao_login SET usado = 1 WHERE usuario_id = ? AND usado = 0"
  ).run(usuarioId);

  const codigo = gerarCodigoNumerico();
  const expiraEm = new Date(Date.now() + VALIDADE_CODIGO_MS).toISOString();
  db.prepare(
    "INSERT INTO codigos_verificacao_login (usuario_id, codigo_hash, expira_em) VALUES (?, ?, ?)"
  ).run(usuarioId, hashComSegredo(codigo), expiraEm);
  return codigo;
}

export type ResultadoVerificacaoCodigo =
  | { ok: true }
  | { ok: false; motivo: "invalido" | "expirado" | "excedeu_tentativas" };

/** Confere o código digitado contra o último código pendente do usuário.
 *  Consome uma tentativa a cada chamada errada; depois de
 *  MAX_TENTATIVAS_CODIGO erros, o código fica bloqueado (precisa gerar um
 *  novo, ou seja, fazer login de novo). */
export function verificarCodigoVerificacao(
  usuarioId: number,
  codigoDigitado: string
): ResultadoVerificacaoCodigo {
  const db = getDb();
  const registro = plainRow(
    db
      .prepare(
        "SELECT * FROM codigos_verificacao_login WHERE usuario_id = ? AND usado = 0 ORDER BY id DESC LIMIT 1"
      )
      .get(usuarioId) as CodigoVerificacaoRow | undefined
  );

  if (!registro) return { ok: false, motivo: "invalido" };
  if (registro.expira_em < new Date().toISOString()) {
    return { ok: false, motivo: "expirado" };
  }
  if (registro.tentativas >= MAX_TENTATIVAS_CODIGO) {
    return { ok: false, motivo: "excedeu_tentativas" };
  }

  const hashDigitado = hashComSegredo(codigoDigitado.trim());
  if (hashDigitado !== registro.codigo_hash) {
    db.prepare(
      "UPDATE codigos_verificacao_login SET tentativas = tentativas + 1 WHERE id = ?"
    ).run(registro.id);
    return { ok: false, motivo: "invalido" };
  }

  db.prepare("UPDATE codigos_verificacao_login SET usado = 1 WHERE id = ?").run(registro.id);
  return { ok: true };
}

/** Marca este navegador/dispositivo como confiável pro usuário — próximos
 *  logins com o mesmo cookie pulam a verificação por e-mail. Devolve o
 *  token em texto puro, pra ser guardado num cookie httpOnly (o banco só
 *  guarda o hash). */
export function criarDispositivoConfiavel(usuarioId: number): string {
  const db = getDb();
  const token = randomBytes(32).toString("base64url");
  db.prepare(
    "INSERT INTO dispositivos_confiaveis (usuario_id, token_hash) VALUES (?, ?)"
  ).run(usuarioId, createHash("sha256").update(token).digest("hex"));
  return token;
}

/** true se o token (vindo do cookie) corresponde a um dispositivo já
 *  verificado desse usuário. Atualiza "último uso" quando confirma. */
export function dispositivoEhConfiavel(usuarioId: number, token: string | undefined): boolean {
  if (!token) return false;
  const db = getDb();
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const registro = plainRow(
    db
      .prepare(
        "SELECT * FROM dispositivos_confiaveis WHERE usuario_id = ? AND token_hash = ?"
      )
      .get(usuarioId, tokenHash) as DispositivoConfiavelRow | undefined
  );
  if (!registro) return false;
  db.prepare("UPDATE dispositivos_confiaveis SET ultimo_uso_em = datetime('now') WHERE id = ?").run(
    registro.id
  );
  return true;
}

export const VALIDADE_COOKIE_DISPOSITIVO_SEGUNDOS = VALIDADE_DISPOSITIVO_DIAS * 24 * 60 * 60;
