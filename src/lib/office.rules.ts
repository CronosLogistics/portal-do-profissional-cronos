export type ProfissionalEscritorio = { fields: { field_1?: string; field_3?: string; E_x002d_MAILCORPORATIVOLookupId?: number | string } };
export function escritorioDoEmail(rows: ProfissionalEscritorio[], usuarios: Map<string, string>, email: string): string | null {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;
  const matches = rows.filter(r => ["ATIVO", "EFETIVADO/ATIVO"].includes(r.fields.field_1?.trim().toUpperCase() ?? "") && usuarios.get(String(r.fields.E_x002d_MAILCORPORATIVOLookupId))?.trim().toLowerCase() === normalized);
  return matches.length === 1 ? matches[0]?.fields.field_3?.trim() || null : null;
}
export function normalizarEscritorio(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\(.*?\)/g, "").trim();
}