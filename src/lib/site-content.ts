export const HOME_FIELDS = [
  { key: "home.badge", label: "Selo do topo", default: "Benefícios exclusivos para profissionais Cronos" },
  { key: "home.title", label: "Título principal", default: "Clube de Vantagens" },
  { key: "home.title_highlight", label: "Palavra em destaque no título", default: "Cronos" },
  {
    key: "home.description",
    label: "Texto de apresentação",
    multiline: true,
    default:
      "Reunimos em um só lugar as parcerias conquistadas para você e sua família: descontos em saúde, academias, restaurantes, estética, cursos, compras e lazer. Escolha uma categoria ou busque pelo parceiro.",
  },
  { key: "home.search_placeholder", label: "Texto da caixa de busca", default: "Buscar parceiro, benefício ou categoria..." },
  { key: "home.new_title", label: "Título — Novas parcerias", default: "Novas parcerias" },
  { key: "home.new_text", label: "Texto — Novas parcerias", default: "Acompanhe as novidades — a lista é atualizada com frequência." },
  { key: "home.explore_title", label: "Título — Explore o clube", default: "Explore o clube" },
  { key: "home.card_benefits_title", label: "Atalho 1 — título", default: "Benefícios" },
  { key: "home.card_benefits_text", label: "Atalho 1 — texto", default: "Plano de saúde, vale alimentação, Total Pass, Cronos Learning e mais." },
  { key: "home.card_partners_title", label: "Atalho 2 — título", default: "Parceiros e descontos" },
  { key: "home.card_partners_text", label: "Atalho 2 — texto", default: "Descontos em alimentação, educação, estética e saúde." },
  { key: "home.card_rewards_title", label: "Atalho 3 — título", default: "Programas de Recompensas" },
  { key: "home.card_rewards_text", label: "Atalho 3 — texto", default: "Indique um Talento, Cronos Genius, PPR e Bônus de Recompras." },
  { key: "home.categories_title", label: "Título — Parceiros por categoria", default: "Parceiros por categoria" },
  { key: "home.categories_text", label: "Texto — Parceiros por categoria", default: "Escolha o tema e veja todos os parceiros disponíveis." },
] as const satisfies ReadonlyArray<{ key: string; label: string; default: string; multiline?: boolean }>;

export type HomeKey = (typeof HOME_FIELDS)[number]["key"];

export function resolveHome(rows: Record<string, string>): Record<HomeKey, string> {
  const out = {} as Record<HomeKey, string>;
  for (const f of HOME_FIELDS) { const v = rows[f.key]; out[f.key] = v && v.trim() ? v : f.default; }
  return out;
}

export const PAGE_GROUPS = [
  { title: "Página inicial", fields: HOME_FIELDS },
  {
    title: "Página Benefícios",
    fields: [
      { key: "beneficios.title", label: "Título", default: "Benefícios" },
      { key: "beneficios.text", label: "Texto de apresentação", multiline: true, default: "Os benefícios oferecidos pela Cronos aos seus profissionais, com valores, orientações de uso, regras e canais de contato." },
    ],
  },
  {
    title: "Página Parceiros e descontos",
    fields: [
      { key: "parceiros.title", label: "Título", default: "Parceiros e descontos" },
      { key: "parceiros.text", label: "Texto de apresentação", multiline: true, default: "Parcerias organizadas por categoria, com as condições de desconto de cada parceiro." },
    ],
  },
  {
    title: "Página Programas de Recompensas",
    fields: [
      { key: "recompensas.title", label: "Título", default: "Programas de Recompensas" },
      { key: "recompensas.text", label: "Texto de apresentação", multiline: true, default: "Programas que reconhecem quem contribui com o crescimento da Cronos." },
    ],
  },
] as const;

export const ALL_FIELDS: ReadonlyArray<{ key: string; label: string; default: string; multiline?: boolean }> =
  PAGE_GROUPS.flatMap((g) => g.fields as ReadonlyArray<{ key: string; label: string; default: string; multiline?: boolean }>);

export function resolveText(rows: Record<string, string>, key: string): string {
  const f = ALL_FIELDS.find((x) => x.key === key);
  const v = rows[key];
  return v && v.trim() ? v : (f?.default ?? "");
}

export function resolveAll(rows: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const f of ALL_FIELDS) out[f.key] = resolveText(rows, f.key);
  return out;
}
