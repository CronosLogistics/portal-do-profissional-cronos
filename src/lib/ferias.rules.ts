export type ItemFerias = { id: string; fields: Record<string, unknown> };
export type FeriasColaborador = {
  id: string; nome: string; inicio: string | null; fim: string | null;
  dias: number | null; retorno: string | null; diasExtras: number | null; suplente: string; status: string;
};

function data(valor: unknown): string | null {
  if (typeof valor !== "string" || !/^\d{4}-\d{2}-\d{2}/.test(valor)) return null;
  return Number.isNaN(Date.parse(valor)) ? null : valor.slice(0, 10);
}

function numero(valor: unknown): number | null {
  if (valor == null || String(valor).trim() === "") return null;
  const n = Number(valor);
  return Number.isFinite(n) ? n : null;
}

export function retornoFerias(fields: Record<string, unknown>): string | null {
  const extrasPreenchidos = fields["DiasExtrasdeAus_x00ea_ncia"] != null && String(fields["DiasExtrasdeAus_x00ea_ncia"]).trim() !== "";
  return (extrasPreenchidos ? data(fields["DatadeRetornocomDiasExtras"]) : null) ?? data(fields["Retorno"]);
}

export function feriasDosAtivos(itens: ItemFerias[], usuarios: Map<string, string>): FeriasColaborador[] {
  return itens.filter(({ fields }) => ["ATIVO", "EFETIVADO/ATIVO"].includes(String(fields["StatusProfissional"] ?? "").trim().toUpperCase())
    && String(fields["Status_x0020_Semana_x0020_F_x00e"] ?? "").trim() !== "")
    .map(({ id, fields: f }) => ({
      id, nome: String(f["Title"] ?? "Profissional não identificado"), inicio: data(f["Inicio"]), fim: data(f["Fim"]),
      dias: numero(f["Dias"]), retorno: retornoFerias(f), diasExtras: numero(f["DiasExtrasdeAus_x00ea_ncia"]),
      suplente: usuarios.get(String(f["SuplenteLookupId"] ?? "")) ?? "-",
      status: String(f["Status_x0020_Semana_x0020_F_x00e"] ?? "").trim(),
    })).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}