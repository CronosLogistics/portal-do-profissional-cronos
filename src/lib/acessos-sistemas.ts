/** Catálogo de atalhos; a autorização pertence a cada sistema de destino. */
export const SISTEMAS_CRONOS = [
  {
    id: "reembolso",
    nome: "Reembolso",
    descricao: "Solicitações e acompanhamento de reembolsos no Espresso.",
    url: "https://app.espressoapp.com.br/users/sign_in",
    grupo: "corporativos",
  },
  {
    id: "skyline",
    nome: "Skyline",
    descricao: "Gestão de operações e processos logísticos.",
    url: "https://cronos.skychart.com.br/skyline-cronos-48511/#/login",
    grupo: "corporativos",
  },
  {
    id: "solides",
    nome: "Sólides",
    descricao: "Controle de ponto e jornada de trabalho.",
    url: "https://app.tangerino.com.br/Tangerino/pages/LoginPage",
    grupo: "corporativos",
  },
  {
    id: "office",
    nome: "Portal Office",
    descricao: "Ferramentas e aplicativos do Microsoft 365.",
    url: "https://portal.office.com/",
    grupo: "corporativos",
  },
  {
    id: "bi-explorer",
    nome: "BI Explorer",
    descricao: "Relatórios e painéis com indicadores da Cronos.",
    url: "https://cronoslogistics.reportload.com/signin?redirect=/",
    grupo: "especificos",
  },
  {
    id: "logcomex",
    nome: "Logcomex",
    descricao: "Dados de comércio exterior e logística internacional.",
    url: "https://plataforma.logcomex.io/",
    grupo: "especificos",
    acesso: "Uso do Comercial",
  },
  {
    id: "visualizacao-qbr",
    nome: "Visualização QBr",
    descricao: "Consulta de apresentações e relatórios QBr.",
    url: "https://insight-guide-share-cronos.lovable.app/",
    grupo: "especificos",
  },
  {
    id: "cronos-insights",
    nome: "Cronos Insights",
    descricao: "Análise e gestão de cotações logísticas.",
    url: "https://cronos-pricing-flow.lovable.app/",
    grupo: "especificos",
  },
] as const;

export type SistemaCronos = (typeof SISTEMAS_CRONOS)[number];