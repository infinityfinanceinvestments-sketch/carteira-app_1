// Regra de senha compartilhada entre cadastro de cliente e redefinição de
// senha (link gerado pelo consultor) — fica num lugar só pra não duplicar
// (e desalinhar) a regra entre os dois pontos que criam senha nova.

export const SENHA_MIN_CARACTERES = 8;

/** Retorna uma mensagem de erro em português se a senha não atender ao
 * mínimo exigido, ou `null` se estiver ok. */
export function validarForcaSenha(senha: string): string | null {
  if (senha.length < SENHA_MIN_CARACTERES) {
    return `A senha precisa ter pelo menos ${SENHA_MIN_CARACTERES} caracteres.`;
  }
  const temLetra = /[a-zA-ZÀ-ÿ]/.test(senha);
  const temNumero = /[0-9]/.test(senha);
  if (!temLetra || !temNumero) {
    return "A senha precisa ter pelo menos uma letra e um número.";
  }
  return null;
}
