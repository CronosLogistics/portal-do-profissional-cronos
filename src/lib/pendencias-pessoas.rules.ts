import type { ItemAnaliseNC } from "./pendencias.rules";

export type PessoaSharePoint = { email: string; nome: string };
export const LISTAS_PESSOAS = {
  experiencia: { id: "2b4ce00d-bed6-4e41-a33c-cea62ce71586", titulo: "Avaliação de Experiência", caminho: "Avaliao Experincia", pessoa: "GestorRespons_x00e1_velLookupId", campos: ["Title", "Experi_x00ea_ncia", "DatadoAgendamento", "Status", "Respons_x00e1_velLookupId", "GestorRespons_x00e1_velLookupId"] },
  agendamento: { id: "6735becd-120c-4c36-bf50-b87c93bd2ddb", titulo: "Agendamento", caminho: "Solicitaes de Treinamentos", pessoa: "Respons_x00e1_velpeloTreinamentoLookupId", campos: ["Title", "DataSugerida", "Aprovado", "StatusdoTreinamento", "Respons_x00e1_velpeloTreinamentoLookupId"] },
  anexos: { id: "e1f03eae-fb54-40ee-bf5a-d09835cd32ce", titulo: "Anexos", caminho: "Anexos  Treinamento", pessoa: "Respons_x00e1_velLookupId", campos: ["Title", "Status", "DatadoTreinamento", "Turma", "Respons_x00e1_velLookupId"] },
  rq0244: { id: "9ed2a791-4cb8-4251-8f9a-413a353b80bb", titulo: "RQ-02-44", caminho: "RQ0244 Treinamento Onboarding e Mudana de Funo", pessoa: "Respons_x00e1_velLookupId", campos: ["Title", "Status", "Admiss_x00e3_o", "Treinamentopara", "Respons_x00e1_velLookupId"] },
  rq0216: { id: "82403f66-ecc5-462b-8aec-0d2c6fb90c60", titulo: "RQ-02-16", caminho: "RQ0216 Registro de Presena em Treinamento", pessoa: "", campos: ["Title", "Status", "Admiss_x00e3_o"] },
  feedback: { id: "24eca013-1ae3-4f33-8e19-e165338808fe", titulo: "Feedback dos Gestores para os Profissionais", caminho: "Feedbacks Gestores", pessoa: "AutorLookupId", campos: ["Title", "Status", "DatadoFeedback", "Classifica_x00e7__x00e3_o", "AutorLookupId", "FinalizadoFeeback_x003f_"] },
} as const;
export type TipoPendenciaPessoas = keyof typeof LISTAS_PESSOAS;
export type PendenciaPessoas = { id: string; nome: string; status: string; detalhe: string; data: string; responsavel: string; gestor: string; prazo: string; dias: number | null; link: string };

export function ehGestaoPessoas(perfis: { nome: string; ativo: boolean }[]): boolean {
  return perfis.some(p => p.ativo && p.nome.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase() === "gestao de pessoas");
}

/** Admin não recebe acesso global ao RH: somente GP ou a pessoa indicada na lista. */
export function pessoasDoUsuario(tipo: TipoPendenciaPessoas, itens: ItemAnaliseNC[], email: string, gestaoPessoas: boolean, usuarios: Map<string, PessoaSharePoint>, agora: Date): PendenciaPessoas[] {
  const cfg = LISTAS_PESSOAS[tipo];
  const alvo = email.trim().toLowerCase();
  if (!alvo) return [];
  const pessoa = (f: Record<string, unknown>, campo: string) => usuarios.get(String(f[campo] ?? ""));
  return itens.flatMap((i): PendenciaPessoas[] => {
    const f = i.fields;
    const indicado = pessoa(f, cfg.pessoa);
    if (!gestaoPessoas && (!cfg.pessoa || !indicado?.email || indicado.email.trim().toLowerCase() !== alvo)) return [];
    const status = String(f[tipo === "agendamento" ? "StatusdoTreinamento" : "Status"] ?? "");
    if (/^(finalizad|cancelad|reprovad)/i.test(status)) return [];
    if ((tipo === "anexos" || tipo === "agendamento") && !/^\s*pendente\s*$/i.test(status)) return [];
    if (tipo === "agendamento" && /^(cancelad|reprovad)/i.test(String(f["Aprovado"] ?? ""))) return [];
    if (tipo === "experiencia" && status.trim()) return [];
    if (tipo === "feedback" && String(f["FinalizadoFeeback_x003f_"] ?? "").toLowerCase() === "sim") return [];
    const admissao = new Date(String(f["Admiss_x00e3_o"] ?? "")).getTime();
    const limite = tipo === "rq0244" ? 30 : 7;
    const prazoMs = admissao + limite * 86_400_000;
    const hoje = new Date(agora.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" }) + "T00:00:00-03:00").getTime();
    const dias = (tipo === "rq0244" || tipo === "rq0216") && Number.isFinite(admissao) ? Math.round((prazoMs - hoje) / 86_400_000) : null;
    return [{ id: i.id, nome: String(f["Title"] ?? "-"), status: status || "Pendente", detalhe: String(f[tipo === "experiencia" ? "Experi_x00ea_ncia" : tipo === "anexos" ? "Turma" : tipo === "rq0244" ? "Treinamentopara" : tipo === "feedback" ? "Classifica_x00e7__x00e3_o" : "Aprovado"] ?? "-"), data: String(f[tipo === "experiencia" ? "DatadoAgendamento" : tipo === "agendamento" ? "DataSugerida" : tipo === "anexos" ? "DatadoTreinamento" : tipo === "feedback" ? "DatadoFeedback" : "Admiss_x00e3_o"] ?? ""), responsavel: (tipo === "experiencia" ? pessoa(f, "Respons_x00e1_velLookupId") : indicado)?.nome ?? "-", gestor: pessoa(f, "GestorRespons_x00e1_velLookupId")?.nome ?? "-", prazo: dias === null ? "" : new Date(prazoMs).toISOString(), dias, link: `https://cronoslogisticscombr.sharepoint.com/sites/peoplemanagementteamgroup/Lists/${encodeURIComponent(cfg.caminho)}/EditForm.aspx?ID=${encodeURIComponent(i.id)}` }];
  });
}