/** Lista oficial de formulários (LISTA DE FORMS CRONOS). Para incluir um, adicione uma linha. */
export type Formulario = { setor: string; titulo: string; codigo?: string; descricao?: string; acao: string; url: string };

export const FORMULARIOS: Formulario[] = [
  { setor: "Controladoria", titulo: "Solicitação de ajuste de custo", descricao: "Exclusão, edição e inserção de custos nos processos", acao: "Ajuste de custo", url: "https://forms.office.com/r/K2w0DWH241" },
  { setor: "Controladoria", titulo: "Cancelamento de processo", acao: "Solicitação de cancelamento de processos", url: "https://forms.office.com/r/eJZpMGrXzk" },
  { setor: "Gestão de Pessoas", titulo: "Portal de Cadastro & Gestão de Treinamentos", acao: "Plataforma - Cadastro & Gestão de Treinamentos", url: "https://cadastrodetreinamento.lovable.app/#processo" },
  { setor: "Marketing", codigo: "RQ-09-02", titulo: "Briefing de Marketing", acao: "Solicitação de Demandas para o Marketing", url: "https://forms.cloud.microsoft/r/Etb0Rijz25" },
  { setor: "Marketing", titulo: "Brindes comerciais", acao: "Solicitação de Brindes", url: "https://cronoslogisticscombr.sharepoint.com/:l:/s/administrationteamgroup/JAAdjcGan5s7T6OTdrpF2TsxASAnQFQwfnpGcjNGjRHVemo?nav=NzBiYzgxZmEtNDE2Ny00ZjFiLWE5NmItNzViNDk2N2NiNzUw" },
  { setor: "Ouvidoria", titulo: "Formulário de Ouvidoria Cronos", acao: "Formulário de Ouvidoria", url: "https://forms.office.com/r/cgLkeNFZ1f" },
  { setor: "Qualidade", titulo: "CRONOS GENIUS – Mentes em Movimento", acao: "Cadastro de ideias já implementadas", url: "https://forms.office.com/r/mEMSsiww8C" },
  { setor: "Qualidade", codigo: "RQ-00-13", titulo: "Sugestão de melhoria e elogio", acao: "Cadastro de Sugestão de melhoria e Elogios", url: "https://cronoslogisticscombr.sharepoint.com/:l:/s/qualityteamgroup/FJ2GTcHoI_FMuABhegMUHbMByGDNiq5D1mmcDCYBJ9ab7Q?nav=MWIzODlkOTctMmUwYy00MjhkLTlhZGQtNDgxMjk5ODQ1NDk0" },
  { setor: "Qualidade", codigo: "RQ-00-02", titulo: "Não conformidade", acao: "Registro de Não Conformidade", url: "https://cronoslogisticscombr.sharepoint.com/:l:/s/qualityteamgroup/FFjvhl5PXUFEjwBj6-7tx0QB38OhowiqUW0HuAp2skyhRA?nav=ZDQyYjc3ZmEtOGQwYi00NjM5LWI3YWUtMDA4MzFiNDUxMzc2" },
  { setor: "Qualidade", titulo: "Cadastro de fornecedor", acao: "Solicitação de cadastro de Fornecedor", url: "https://forms.cloud.microsoft/r/fcrKi2D9DD" },
  { setor: "Qualidade", titulo: "Cadastro de clientes", acao: "Solicitação de cadastro de Clientes", url: "https://forms.cloud.microsoft/r/SfdWFqJnfh" },
  { setor: "TLD", titulo: "Solicitação/atualização de cadastro de agentes", acao: "Solicitação de cadastro de agentes", url: "https://forms.cloud.microsoft/r/WycLYGBcun" },
  { setor: "TI", titulo: "Abertura de ticket / Ticket opening", acao: "Cadastro de ticket", url: "https://cronoslogisticscombr.sharepoint.com/:l:/s/ITTeamGroup/JAD5KiJVEsADS6Ozp7BosA0_AY-NghuEgBYbHJCq2Cau4s4?nav=M2M2MTk4ZjktZWRlMC00ZmNiLTlmNDItMzkyZGUzN2JkODgx" },
];

const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

/** Filtra por setor e busca (sem acento), mantendo a ordem por setor. */
export function filtrarFormularios(busca: string, setor?: string) {
  const q = norm(busca.trim());
  return FORMULARIOS.filter(
    (f) => (!setor || f.setor === setor) && (!q || norm(`${f.titulo} ${f.codigo ?? ""} ${f.descricao ?? ""} ${f.acao} ${f.setor}`).includes(q)),
  );
}

export const SETORES = [...new Set(FORMULARIOS.map((f) => f.setor))];
