/** Regras puras do organograma: estrutura oficial (Diretoria COO/CEO → áreas → departamentos) e nível pelo cargo. */
export type NoOrganograma = { id: string; titulo: string; tipo: "exec" | "grupo" | "dep"; diretor?: RegExp; filhos?: NoOrganograma[] };

const dep = (id: string, titulo = id): NoOrganograma => ({ id, titulo, tipo: "dep" });
const grupo = (id: string, filhos: NoOrganograma[], titulo = id): NoOrganograma => ({ id, titulo, tipo: "grupo", filhos });

/** Hierarquia oficial validada pela Gestão de Pessoas (organograma.html). O id de cada nó é o valor salvo em "área". */
export const ESTRUTURA: NoOrganograma[] = [
  { id: "Diretoria COO", titulo: "Diretoria COO", tipo: "exec", diretor: /RENGEL/, filhos: [
    grupo("Administrativo e Gestão de Pessoas", [dep("Gestão de Pessoas"), dep("Administrativo")]),
    dep("Tecnologia"),
    dep("Financeiro"),
    dep("Controladoria"),
    dep("Qualidade"),
    grupo("Operação", [
      dep("Operação Importação Marítima", "Importação Marítima"),
      dep("Operação Exportação Marítima", "Exportação Marítima"),
      dep("Operação Importação Aérea", "Importação Aérea"),
      dep("Operação Exportação Aérea", "Exportação Aérea"),
    ]),
    grupo("Pricing", [
      grupo("Pricing Marítimo", [dep("Pricing Importação Marítima", "Importação Marítima"), dep("Pricing Exportação Marítima", "Exportação Marítima")]),
      grupo("Pricing Aéreo", [dep("Pricing Importação Aérea", "Importação Aérea"), dep("Pricing Exportação Aérea", "Exportação Aérea")]),
      dep("Pricing Internacional", "Internacional"),
    ]),
    dep("TLD"),
    dep("Comercial Nordeste"),
  ] },
  { id: "Diretoria CEO", titulo: "Diretoria CEO", tipo: "exec", diretor: /BERNARDES/, filhos: [
    grupo("Comercial SC e ES", [dep("Comercial SC"), dep("Comercial ES")]),
    grupo("Comercial RS e Caxias do Sul", [dep("Comercial RS"), dep("Adm. Caxias do Sul")]),
    dep("Comercial PR"),
    dep("Comercial SP"),
    dep("Marketing"),
  ] },
];

function ids(nos: NoOrganograma[]): string[] {
  return nos.flatMap((n) => (n.tipo === "exec" ? ids(n.filhos ?? []) : [n.id, ...ids(n.filhos ?? [])]));
}
export const AREAS = ["Diretoria", ...ids(ESTRUTURA), "Outros"] as const;
export type Area = string;

export const NIVEIS = ["Diretoria", "Gerência", "Coordenação", "Supervisão", "Especialista", "Analista/consultor", "Sales ops/SDR", "Assistente", "Estágio", "Auxiliar", "Sem cargo"] as const;
export type Nivel = (typeof NIVEIS)[number];

const norm = (s: string | null | undefined) => (s ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/\s+/g, " ").trim();

/** Departamentos do SharePoint → nó do organograma. Registros "guarda-chuva" ficam no grupo correspondente. */
const MAPA: Record<string, string> = {
  "GESTAO DE PESSOAS": "Gestão de Pessoas",
  "ADMINISTRATIVO": "Administrativo",
  "ADMINISTRATIVO E GESTAO DE PESSOAS": "Administrativo e Gestão de Pessoas",
  "TECNOLOGIA": "Tecnologia",
  "TI": "Tecnologia",
  "FINANCEIRO": "Financeiro",
  "CONTROLADORIA": "Controladoria",
  "FINANCEIRO E CONTROLADORIA": "Financeiro",
  "QUALIDADE": "Qualidade",
  "OPERACAO MULTIMODAL": "Operação",
  "OPERACAO IMPORTACAO MARITIMA": "Operação Importação Marítima",
  "OPERACAO EXPORTACAO MARITIMA": "Operação Exportação Marítima",
  "OPERACAO IMPORTACAO AEREA": "Operação Importação Aérea",
  "OPERACAO EXPORTACAO AEREA": "Operação Exportação Aérea",
  "PRICING IMPORTACAO E EXPORTACAO MARITIMA": "Pricing Marítimo",
  "PRICING IMPORTACAO E EXPORTACAO AEREA": "Pricing Aéreo",
  "PRICING IMPORTACAO MARITIMA": "Pricing Importação Marítima",
  "PRICING EXPORTACAO MARITIMA": "Pricing Exportação Marítima",
  "PRICING IMPORTACAO AEREA": "Pricing Importação Aérea",
  "PRICING EXPORTACAO AEREA": "Pricing Exportação Aérea",
  "PRICING INTERNACIONAL": "Pricing Internacional",
  "TLD": "TLD",
  "COMERCIAL NORDESTE": "Comercial Nordeste",
  "COMERCIAL SC": "Comercial SC",
  "COMERCIAL ES": "Comercial ES",
  "COMERCIAL RS": "Comercial RS",
  "ADMINISTRATIVO ESCRITORIO CAXIAS DO SUL": "Adm. Caxias do Sul",
  "COMERCIAL PR": "Comercial PR",
  "COMERCIAL SP": "Comercial SP",
  "MARKETING": "Marketing",
};

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
  if (MAPA[d]) return MAPA[d]!;
  if (/DIRETORIA/.test(d)) return "Diretoria";
  return "Outros";
}

/** Área final: ajuste salvo prevalece sobre a dedução automática, desde que seja uma área válida. */
export function areaFinal(ajuste: string | null | undefined, dep: string | null, cargo: string | null): Area {
  return (AREAS as readonly string[]).includes(ajuste ?? "") ? (ajuste as Area) : areaDoDepartamento(dep, cargo);
}

/** Posição visual do gestor do grupo oficial, sem alterar departamento ou permissões. */
export function areaVisualOrganograma(pessoa: { nome: string; area: Area }): Area {
  if (
    ["Comercial SC", "Comercial ES"].includes(pessoa.area) &&
    /^CAMILA\b.*\bTOPANOTTI\b/.test(norm(pessoa.nome))
  ) return "Comercial SC e ES";
  if (
    ["Comercial RS", "Adm. Caxias do Sul"].includes(pessoa.area) &&
    /^ANA\b.*\bBUENO\b/.test(norm(pessoa.nome))
  ) return "Comercial RS e Caxias do Sul";
  return pessoa.area;
}

/**
 * Líder imediato no organograma: entre os líderes sincronizados do SharePoint que estão visíveis na mesma área,
 * escolhe o de nível mais próximo acima do liderado (supervisor antes de coordenador, antes de gerência/diretoria).
 * Líderes de nível igual ou inferior são ignorados para evitar ciclos.
 */
export function liderImediato(
  pessoa: { nivel: Nivel; area: Area },
  lideres: { id: string; nivel: Nivel; area: Area }[],
): string | null {
  const meu = NIVEIS.indexOf(pessoa.nivel);
  let melhor: { id: string; i: number } | null = null;
  for (const l of lideres) {
    const i = NIVEIS.indexOf(l.nivel);
    if (l.area !== pessoa.area || i >= meu) continue;
    if (!melhor || i > melhor.i || (i === melhor.i && l.id < melhor.id)) melhor = { id: l.id, i };
  }
  return melhor?.id ?? null;
}
