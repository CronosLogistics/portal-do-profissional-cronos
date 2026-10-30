/** Regras puras do menu Elogios (lista RQ0013 do SharePoint). */

export type Pessoa = { LookupId?: number | string; LookupValue?: string; Email?: string };

export type ItemLista = { id: string; fields: Record<string, unknown>; createdBy?: { user?: { displayName?: string } } };

export type Elogio = {
  id: string;
  data: string | null;
  detalhamento: string;
  origem: string;
  cliente: string;
  departamento: string;
  status: string;
  envolvidos: string[];
  gestor: string | null;
  elogiador: string | null;
  /** "meu" = sou envolvida; "equipe" = sou o gestor indicado na linha. */
  vinculo: "meu" | "equipe";
};

export const CAMPO_TIPO = "field_4";
export const TIPO_ELOGIO = "Elogio - EL";
export const CAMPO_ENVOLVIDOS = "PROFISSIONALRESPONS_x00c1_VEL_NE";
export const CAMPO_GESTOR = "GESTOR_CONSIDERACOESLookupId";
export const CAMPO_AUTOR = "AuthorLookupId";

const norm = (e: string | undefined | null) => (e ?? "").trim().toLowerCase();
const texto = (v: unknown) => {
  const s = typeof v === "string" ? v.trim() : "";
  return s === "N/A" ? "" : s;
};
const nome = (p: Pessoa) => (p.LookupValue ?? "").replace(/\s*-\s*Cronos Logistics$/i, "").trim();

/** Filtra os elogios que a pessoa pode ver: os dela e os em que ela é a gestora da linha. */
export function elogiosVisiveis(
  itens: ItemLista[],
  emailUsuario: string,
  usuariosSite: Map<string, { email: string; nome: string }>,
): Elogio[] {
  const eu = norm(emailUsuario);
  if (!eu) return [];
  const out: Elogio[] = [];
  for (const it of itens) {
    const f = it.fields;
    if (f[CAMPO_TIPO] !== TIPO_ELOGIO) continue;
    const envolvidos = Array.isArray(f[CAMPO_ENVOLVIDOS]) ? (f[CAMPO_ENVOLVIDOS] as Pessoa[]) : [];
    const gestorId = f[CAMPO_GESTOR] == null ? null : String(f[CAMPO_GESTOR]);
    const gestor = gestorId ? usuariosSite.get(gestorId) ?? null : null;
    const souEnvolvida = envolvidos.some((p) => norm(p.Email) === eu);
    const souGestor = !!gestor && norm(gestor.email) === eu;
    if (!souEnvolvida && !souGestor) continue;
    out.push({
      id: it.id,
      data: (typeof f["field_5"] === "string" && f["field_5"]) || (typeof f["Created"] === "string" ? f["Created"] : null),
      detalhamento: texto(f["field_15"]),
      origem: texto(f["field_8"]),
      cliente: texto(f["field_10"]),
      departamento: texto(f["field_12"]),
      status: texto(f["field_20"]),
      envolvidos: envolvidos.map(nome).filter(Boolean),
      gestor: gestor?.nome ?? null,
      elogiador: (f[CAMPO_AUTOR] != null ? usuariosSite.get(String(f[CAMPO_AUTOR]))?.nome : null) || texto(it.createdBy?.user?.displayName).replace(/\s*-\s*Cronos Logistics$/i, "") || null,
      vinculo: souEnvolvida ? "meu" : "equipe",
    });
  }
  return out.sort((a, b) => (b.data ?? "").localeCompare(a.data ?? ""));
}
