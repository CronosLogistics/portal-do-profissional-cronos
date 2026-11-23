/** Regras puras do organograma: área (DR-02-02) e nível hierárquico a partir do SharePoint. */
export const AREAS = ["Diretoria", "Gestão de Pessoas", "Administrativo", "Tecnologia", "Financeiro e Controladoria", "Operação", "Pricing", "Comercial", "Marketing", "Outros"] as const;
export type Area = (typeof AREAS)[number];

export const NIVEIS = ["Diretoria", "Gerência", "Coordenação", "Supervisão", "Especialista", "Analista/consultor", "Sales ops/SDR", "Assistente", "Estágio", "Auxiliar", "Sem cargo"] as const;
export type Nivel = (typeof NIVEIS)[number];

const norm = (s: string | null | undefined) => (s ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();

export function nivelDoCargo(cargo: string | null | undefined): Nivel {
  const c = norm(cargo);
  if (!c.trim()) return "Sem cargo";
  if (/\b(CEO|COO|CFO|DIRETORA?|SOCIOA?)\b/.test(c)) return "Diretoria";
  if (/GERENTE/.test(c)) return "Gerência";
  if (/COORDENADOR/.test(c)) return "Coordenação";
  if (/SUPERVISOR/.test(c)) return "Supervisão";
  if (/ESPECIALISTA/.test(c)) return "Especialista";
  if (/\bSDR\b|SALES OPS/.test(c)) return "Sales ops/SDR";
  if (/ESTAGI/.test(c)) return "Estágio";
  if (/AUXILIAR/.test(c)) return "Auxiliar";
  if (/ASSISTENTE/.test(c)) return "Assistente";
  return "Analista/consultor";
}

export function areaDoDepartamento(dep: string | null | undefined, cargo?: string | null): Area {
  if (nivelDoCargo(cargo) === "Diretoria") return "Diretoria";
  const d = norm(dep);
  if (/DIRETORIA/.test(d)) return "Diretoria";
  if (/GESTAO DE PESSOAS|\bRH\b|RECURSOS HUMANOS/.test(d)) return "Gestão de Pessoas";
  if (/FINANC|CONTROLADORIA|FATURAMENTO/.test(d)) return "Financeiro e Controladoria";
  if (/TECNOLOGIA|\bTI\b|\bBI\b|INOVACAO/.test(d)) return "Tecnologia";
  if (/MARKETING/.test(d)) return "Marketing";
  if (/PRICING/.test(d)) return "Pricing";
  if (/COMERCIAL|VENDAS|SALES/.test(d)) return "Comercial";
  if (/OPERAC|IMPORT|EXPORT|MARITIM|AEREO|AEREA|\bIMP\b|\bEXP\b/.test(d)) return "Operação";
  if (/ADMINISTRATIV|QUALIDADE|COMPRAS|JURIDICO/.test(d)) return "Administrativo";
  return "Outros";
}

/** Área final: ajuste salvo prevalece sobre a dedução automática, desde que seja uma área válida. */
export function areaFinal(ajuste: string | null | undefined, dep: string | null, cargo: string | null): Area {
  return (AREAS as readonly string[]).includes(ajuste ?? "") ? (ajuste as Area) : areaDoDepartamento(dep, cargo);
}
