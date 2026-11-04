import type { ItemAnaliseNC } from "./pendencias.rules";
import type { PessoaSharePoint } from "./pendencias-pessoas.rules";

export const NIVEIS = ["lider", "coordenador", "supervisor", "liderado"] as const;
export type NivelDepartamento = typeof NIVEIS[number];
const COLUNAS = { lider: "Permiss_x00f5_esdoL_x00ed_der", coordenador: "Permiss_x00e3_odoCoordenador", supervisor: "Permiss_x00f5_esdoSupervisor", liderado: "Permiss_x00f5_esdosLiderados" };
const MAPA: Record<string, string> = {
  "Publicar avisos": "avisos.publicar", "Gerenciar avisos": "avisos.gerenciar", "Publicar o Cronos Insider": "avisos.insider",
  "Editar conteúdos": "conteudo.editar", "Gerenciar documentos": "documentos.gerenciar", "Gerenciar formulários": "formularios.gerenciar",
};
export const normalizarEmail = (email: string) => email.trim().toLowerCase();
const valores = (v: unknown): string[] => Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
export function permissoesDepartamento(f: Record<string, unknown>, nivel: NivelDepartamento): string[] {
  const escolhas = valores(f[COLUNAS[nivel]]);
  const codigos = escolhas.flatMap(p => MAPA[p] ? [MAPA[p]] : []);
  if (nivel !== "liderado" && escolhas.some(p => p === "Visualizar pendências" || p === "Visualizar pendências dos liderados")) codigos.push("pendencias.liderados");
  return [...new Set(codigos)];
}
export type SnapshotDepartamentos = {
  departamentos: { id: string; nome: string; perfis: { nivel: NivelDepartamento; permissoes: string[] }[] }[];
  pessoas: { email: string; departamento: string | null; vinculos: { departamento: string; nivel: NivelDepartamento }[] }[];
  hierarquia: { departamento: string; lider: string; liderado: string }[];
};
/** Identity is joined through corporate person lookups, never names. Ambiguous people fail closed. */
export function montarDepartamentos(departamentos: ItemAnaliseNC[], profissionais: ItemAnaliseNC[], usuarios: Map<string, PessoaSharePoint>): SnapshotDepartamentos {
  const porEmail = new Map<string, ItemAnaliseNC[]>();
  for (const p of profissionais) {
    if (!["ATIVO", "EFETIVADO/ATIVO"].includes(String(p.fields['field_1'] ?? "").trim().toUpperCase())) continue;
    const email = normalizarEmail(usuarios.get(String(p.fields['E_x002d_MAILCORPORATIVOLookupId'] ?? ""))?.email ?? "");
    if (email) porEmail.set(email, [...(porEmail.get(email) ?? []), p]);
  }
  const snapshot: SnapshotDepartamentos = { departamentos: [], pessoas: [], hierarquia: [] };
  const pessoas = new Map<string, SnapshotDepartamentos["pessoas"][number]>();
  const idsDepartamentos = new Set(departamentos.map(d => d.id));
  for (const [email, rows] of porEmail) {
    const fields = rows.length === 1 ? rows[0]?.fields : undefined;
    const atual = String(fields?.['DEPARTAMENTOATUALLookupId'] ?? "").trim();
    const id = fields ? atual || String(fields['SETORLookupId'] ?? "").trim() : "";
    pessoas.set(email, { email, departamento: idsDepartamentos.has(id) ? id : null, vinculos: [] });
  }
  const identidade = (id: unknown) => normalizarEmail(usuarios.get(String(id ?? ""))?.email ?? "");
  for (const d of departamentos) {
    const nome = String(d.fields['Title'] ?? "").trim();
    if (!nome) continue;
    snapshot.departamentos.push({ id: d.id, nome, perfis: NIVEIS.map(nivel => ({ nivel, permissoes: permissoesDepartamento(d.fields, nivel) })) });
    const niveis = new Map<string, NivelDepartamento>();
    const atribuir = (email: string, nivel: NivelDepartamento) => {
      if (!email || (porEmail.has(email) && porEmail.get(email)?.length !== 1)) return;
      const antigo = niveis.get(email);
      if (!antigo || NIVEIS.indexOf(nivel) < NIVEIS.indexOf(antigo)) niveis.set(email, nivel);
    };
    atribuir(identidade(d.fields['L_x00ed_derDiretoLookupId']), "lider");
    atribuir(identidade(d.fields['CoordenadorLookupId']), "coordenador");
    for (const supervisor of Array.isArray(d.fields['Supervisor']) ? d.fields['Supervisor'] : []) {
      if (supervisor && typeof supervisor === "object" && "LookupId" in supervisor) atribuir(identidade(supervisor.LookupId), "supervisor");
    }
    for (const [email, p] of pessoas) if (p.departamento === d.id) atribuir(email, "liderado");
    for (const [email, nivel] of niveis) {
      const p = pessoas.get(email) ?? { email, departamento: null, vinculos: [] };
      p.vinculos.push({ departamento: d.id, nivel }); pessoas.set(email, p);
      if (!permissoesDepartamento(d.fields, nivel).includes("pendencias.liderados")) continue;
      for (const [alvo, nivelAlvo] of niveis) if (alvo !== email && NIVEIS.indexOf(nivelAlvo) > NIVEIS.indexOf(nivel)) snapshot.hierarquia.push({ departamento: d.id, lider: email, liderado: alvo });
    }
  }
  snapshot.pessoas = [...pessoas.values()];
  return snapshot;
}
/** Only union already filtered projections; never return unfiltered SharePoint records. */
export function unirPendencias<T extends { id: string }>(alvos: string[], filtrar: (email: string) => T[]): T[] {
  return [...new Map(alvos.flatMap(filtrar).map(item => [item.id, item])).values()];
}