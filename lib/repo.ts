// Camada de acesso a dados (repositório), dividida em módulos por domínio
// dentro de lib/repo/ — este arquivo reexporta tudo pra manter "@/lib/repo"
// (e "./repo" a partir de outros arquivos de lib/) como o único ponto de
// import usado pelo resto do app, sem precisar atualizar as dezenas de
// arquivos (rotas de API, páginas, outros módulos de lib) que já importam
// daqui. A divisão em arquivos por domínio é só organizacional — nenhum
// comportamento muda.
export * from "./repo/usuarios";
export * from "./repo/clientes";
export * from "./repo/posicoes";
export * from "./repo/favoritos";
export * from "./repo/carteiras-modelo";
export * from "./repo/historico";
export * from "./repo/recomendacoes";
export * from "./repo/solicitacoes-recomendacao";
export * from "./repo/movimentacoes";
export * from "./repo/agregacoes";
export * from "./repo/termos";
export * from "./repo/redefinicao-senha";
export * from "./repo/auditoria";
export * from "./repo/proventos";
export * from "./repo/notificacoes";
export * from "./repo/objetivos";
export * from "./repo/indices";
export * from "./repo/dois-fatores";
export * from "./repo/recados";
