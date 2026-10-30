/** Regras puras das pendências (Análise de NC da Qualidade). */
export type ItemAnaliseNC = {
  id: string;
  fields: Record<string, unknown> & {
    NCLookupId?: string;
    Respons_x00e1_velLookupId?: string;
    Created?: string;
    Data_Fechamento?: string | null;
    Situa_x00e7__x00e3_odaAn_x00e1_l?: string;
    StatusAn_x00e1_liseMaior?: string;
  };
};

export type PendenciaNC = {
  id: string;
  nc: string;
  status: "No prazo" | "A vencer" | "Vencido";
  diasSemResposta: number;
  responsavel: string;
  link: string;
};

export const LINK_ANALISE_NC = "https://cronoslogisticscombr.sharepoint.com/sites/qualityteamgroup/Lists/Plano%20de%20ao/EditForm.aspx?ID=";

/** Igual à fórmula do SharePoint: TRUNCAR(HOJE()-Criado), calculado agora (a coluna calculada fica desatualizada). */
export const LINK_ANALISE_NC_MAIOR = "https://cronoslogisticscombr.sharepoint.com/sites/qualityteamgroup/Lists/PLANO%20DE%20AO1/EditForm.aspx?ID=";

/** Regras de cada lista: campo de situação, link e prazo (igual às colunas calculadas do SharePoint). */
export const LISTA_NC = {
  analise: { situacao: "Situa_x00e7__x00e3_odaAn_x00e1_l", link: LINK_ANALISE_NC, status: (d: number): PendenciaNC["status"] => (d >= 1 ? "Vencido" : "No prazo") },
  maior: { situacao: "StatusAn_x00e1_liseMaior", link: LINK_ANALISE_NC_MAIOR, status: (d: number): PendenciaNC["status"] => (d >= 8 ? "Vencido" : d === 7 ? "A vencer" : "No prazo") },
} as const;
export type TipoListaNC = keyof typeof LISTA_NC;

export function diasSemResposta(criado: string, agora: Date): number {
  return Math.max(0, Math.trunc((agora.getTime() - new Date(criado).getTime()) / 86_400_000));
}

export function statusPorTempo(dias: number): PendenciaNC["status"] {
  return dias >= 1 ? "Vencido" : "No prazo";
}

/** Abertas (sem fechamento, não canceladas) em que o e-mail do perfil é o Responsável. */
export function pendenciasDoUsuario(
  itens: ItemAnaliseNC[],
  email: string,
  usuarios: Map<string, { email: string; nome: string }>,
  ncs: Map<string, string>,
  agora: Date,
  tipo: TipoListaNC = "analise",
): PendenciaNC[] {
  const cfg = LISTA_NC[tipo];
  const alvo = email.trim().toLowerCase();
  return itens
    .filter((i) => {
      const f = i.fields;
      if (f.Data_Fechamento || !f.Created) return false;
      const sit = String(f[cfg.situacao] ?? "");
      if (/^(cancelad|finalizad)/i.test(sit)) return false;
      const resp = f.Respons_x00e1_velLookupId ? usuarios.get(String(f.Respons_x00e1_velLookupId)) : undefined;
      return !!resp && resp.email.trim().toLowerCase() === alvo;
    })
    .map((i) => {
      const dias = diasSemResposta(i.fields.Created!, agora);
      return {
        id: i.id,
        nc: ncs.get(String(i.fields.NCLookupId ?? "")) ?? "—",
        status: cfg.status(dias),
        diasSemResposta: dias,
        responsavel: usuarios.get(String(i.fields.Respons_x00e1_velLookupId))?.nome ?? "",
        link: cfg.link + encodeURIComponent(i.id),
      };
    })
    .sort((a, b) => b.diasSemResposta - a.diasSemResposta);
}

export const LINK_PLANO_ACAO = "https://cronoslogisticscombr.sharepoint.com/sites/qualityteamgroup/Lists/PLANO%20DE%20AO2/EditForm.aspx?ID=";

/** Status do plano de ação pelo Prazo: Vencido após o prazo, A vencer faltando ≤ 2 dias, senão No prazo. */
export function statusPlanoAcao(prazo: string, agora: Date): { status: PendenciaNC["status"]; diasAtraso: number } {
  const dif = Math.floor((agora.getTime() - new Date(prazo).getTime()) / 86_400_000);
  if (agora.getTime() > new Date(prazo).getTime()) return { status: "Vencido", diasAtraso: Math.max(0, dif) };
  return { status: -dif - 1 <= 2 ? "A vencer" : "No prazo", diasAtraso: 0 };
}

/** Ações abertas em que o e-mail do perfil é o Responsável ou o Gestor responsável. */
export function planosDoUsuario(
  itens: ItemAnaliseNC[],
  email: string,
  usuarios: Map<string, { email: string; nome: string }>,
  ncs: Map<string, string>,
  agora: Date,
): PendenciaNC[] {
  const alvo = email.trim().toLowerCase();
  const eh = (id: unknown) => !!id && usuarios.get(String(id))?.email.trim().toLowerCase() === alvo;
  return itens
    .filter((i) => {
      const f = i.fields;
      if (String(f["Essaa_x00e7__x00e3_oest_x00e1_fi"] ?? "") === "Sim") return false;
      if (/^(conclu|cancel)/i.test(String(f["Status"] ?? ""))) return false;
      return eh(f.Respons_x00e1_velLookupId) || eh(f["GestorRespons_x00e1_velLookupId"]);
    })
    .map((i) => {
      const prazo = i.fields["Prazo"] ? String(i.fields["Prazo"]) : null;
      const s = prazo ? statusPlanoAcao(prazo, agora) : { status: "No prazo" as const, diasAtraso: 0 };
      return {
        id: i.id,
        nc: ncs.get(String(i.fields.NCLookupId ?? "")) ?? "—",
        status: s.status,
        diasSemResposta: s.diasAtraso,
        responsavel: usuarios.get(String(i.fields.Respons_x00e1_velLookupId))?.nome ?? "",
        link: LINK_PLANO_ACAO + encodeURIComponent(i.id),
      };
    })
    .sort((a, b) => b.diasSemResposta - a.diasSemResposta);
}
