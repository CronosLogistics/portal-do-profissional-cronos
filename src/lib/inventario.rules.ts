/** Regras puras de acesso ao Inventário de Brindes (Comercial), baseadas na lista "Responsáveis pelos Escritórios". */
export type ResponsavelEscritorio = { id: string; titulo: string; escritorio: string; email: string; link: string | null };
export type ContextoInventario = { email: string; admin: boolean; departamento: string | null };

const norm = (v: string | null | undefined) => (v ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toUpperCase();

/** Administrador e MARKETING veem todos; responsáveis (Coordenador/Gerente) veem só os próprios cadastros; demais, nenhum. Cada cadastro é um inventário separado (ex.: TLD ≠ Comercial Itajaí). */
export function inventariosPermitidos(resps: ResponsavelEscritorio[], ctx: ContextoInventario): ResponsavelEscritorio[] {
  const email = ctx.email.trim().toLowerCase();
  const comLink = resps.filter((r) => !!r.link);
  if (!email) return [];
  const marketing = norm(ctx.departamento) === "MARKETING" || resps.some((r) => r.email === email && norm(r.titulo).includes("MARKETING"));
  if (ctx.admin || marketing) return comLink;
  return comLink.filter((r) => r.email === email);
}

/** Endereço da lista sem a página de visualização (AllItems.aspx etc.), decodificado e em minúsculas. */
export function urlBaseLista(url: string): string {
  let u = url.split("?")[0] ?? "";
  try { u = decodeURIComponent(u); } catch { /* mantém */ }
  u = u.replace(/\/+$/, "");
  if (/\.aspx$/i.test(u)) u = u.slice(0, u.lastIndexOf("/"));
  return u.toLowerCase();
}
