/** Regras puras das pendências (Análise de NC da Qualidade). */
export type ItemAnaliseNC = {
  id: string;
  fields: Record<string, unknown> & {
    NCLookupId?: string;
    Respons_x00e1_velLookupId?: string;
    Created?: string;
    Data_Fechamento?: string | null;
    Situa_x00e7__x00e3_odaAn_x00e1_l?: string;
  };
};

export type PendenciaNC = {
  id: string;
  nc: string;
  status: "No prazo" | "Vencido";
  diasSemResposta: number;
  responsavel: string;
  link: string;
};

export const LINK_ANALISE_NC = "https://cronoslogisticscombr.sharepoint.com/sites/qualityteamgroup/Lists/Plano%20de%20ao/EditForm.aspx?ID=";

/** Igual à fórmula do SharePoint: TRUNCAR(HOJE()-Criado), calculado agora (a coluna calculada fica desatualizada). */
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
): PendenciaNC[] {
  const alvo = email.trim().toLowerCase();
  return itens
    .filter((i) => {
      const f = i.fields;
      if (f.Data_Fechamento || !f.Created) return false;
      if (f.Situa_x00e7__x00e3_odaAn_x00e1_l === "Cancelada" || f.Situa_x00e7__x00e3_odaAn_x00e1_l === "Finalizada") return false;
      const resp = f.Respons_x00e1_velLookupId ? usuarios.get(String(f.Respons_x00e1_velLookupId)) : undefined;
      return !!resp && resp.email.trim().toLowerCase() === alvo;
    })
    .map((i) => {
      const dias = diasSemResposta(i.fields.Created!, agora);
      return {
        id: i.id,
        nc: ncs.get(String(i.fields.NCLookupId ?? "")) ?? "—",
        status: statusPorTempo(dias),
        diasSemResposta: dias,
        responsavel: usuarios.get(String(i.fields.Respons_x00e1_velLookupId))?.nome ?? "",
        link: LINK_ANALISE_NC + encodeURIComponent(i.id),
      };
    })
    .sort((a, b) => b.diasSemResposta - a.diasSemResposta);
}
