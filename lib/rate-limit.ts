// Limitador de tentativas simples, em memória — mesmo espírito dos caches
// de lib/cotacoes.ts, lib/indices.ts e lib/proventos-auto.ts: sem Redis nem
// infraestrutura extra, funciona porque o processo do Next.js aqui é
// persistente (não serverless) — os contadores só reiniciam se o servidor
// reiniciar, o que é aceitável pro tamanho de uso deste app. Se o backend
// algum dia rodar em múltiplas instâncias atrás de um load balancer, isso
// precisaria virar um contador compartilhado (Redis, por exemplo).

interface Balde {
  tentativas: number;
  desdeMs: number;
}

const baldes = new Map<string, Balde>();

// Varredura leve pra não deixar a Map crescer pra sempre com IPs que
// tentaram uma vez e nunca mais voltaram.
const JANELA_MAXIMA_VARREDURA_MS = 2 * 60 * 60 * 1000; // 2h — cobre folgadamente todas as janelas usadas hoje
let ultimaVarredura = Date.now();
function varrerAntigos() {
  const agora = Date.now();
  if (agora - ultimaVarredura < 10 * 60 * 1000) return;
  ultimaVarredura = agora;
  for (const [chave, balde] of baldes) {
    if (agora - balde.desdeMs > JANELA_MAXIMA_VARREDURA_MS) baldes.delete(chave);
  }
}

function balderAtivo(chave: string, janelaMs: number): Balde | undefined {
  const balde = baldes.get(chave);
  if (!balde) return undefined;
  if (Date.now() - balde.desdeMs > janelaMs) {
    baldes.delete(chave);
    return undefined;
  }
  return balde;
}

// Liga/desliga a trava de tentativas de login/2FA sem precisar mexer no
// código toda vez — desativada por padrão (foi desligada a pedido, pra
// facilitar testes de login em produção). Pra reativar, basta adicionar
// LOGIN_RATE_LIMIT_ATIVO=true nas variáveis de ambiente do Railway (o
// deploy pega a mudança sozinho, sem precisar de um novo commit).
export function limiteDeLoginAtivo(): boolean {
  return process.env.LOGIN_RATE_LIMIT_ATIVO === "true";
}

export interface ResultadoLimite {
  permitido: boolean;
  /** Segundos até poder tentar de novo — só relevante quando `permitido` é false. */
  retryApósSegundos: number;
}

/** Só verifica (não incrementa) se `chave` já bateu no limite de tentativas
 * dentro da janela — use antes de processar a requisição, pra nem gastar
 * ciclo comparando senha/token se já está bloqueado. */
export function verificarLimite(
  chave: string,
  maxTentativas: number,
  janelaMs: number
): ResultadoLimite {
  varrerAntigos();
  const balde = balderAtivo(chave, janelaMs);
  if (!balde || balde.tentativas < maxTentativas) {
    return { permitido: true, retryApósSegundos: 0 };
  }
  const retryApósSegundos = Math.max(
    1,
    Math.ceil((balde.desdeMs + janelaMs - Date.now()) / 1000)
  );
  return { permitido: false, retryApósSegundos };
}

/** Registra uma tentativa que falhou (senha errada, token inválido etc.) —
 * chame só quando a tentativa de fato falhar, pra não punir quem só demorou
 * a digitar a senha certa. */
export function registrarFalha(chave: string, janelaMs: number): void {
  const balde = balderAtivo(chave, janelaMs);
  if (!balde) {
    baldes.set(chave, { tentativas: 1, desdeMs: Date.now() });
    return;
  }
  balde.tentativas += 1;
}

/** Identifica a origem da requisição pra usar como parte da chave do limite
 * — usa o primeiro IP de x-forwarded-for (a maioria dos hosts/proxies seta
 * isso), caindo pra um valor fixo compartilhado se não tiver nenhum (ex:
 * rodando local sem proxy na frente). */
export function identificarOrigem(req: { headers: { get(name: string): string | null } }): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  return "origem-desconhecida";
}
