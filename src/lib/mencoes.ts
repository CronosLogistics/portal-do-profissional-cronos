import { supabase } from "@/integrations/supabase/client";

/** Mention token stored in plain text and HTML alike: @[Nome](u:uuid) or @[Departamento](d:id). Mirrors registrar_mencoes in the database. */
export const MENCAO_RE = /@\[([^\][]{1,80})\]\((u|d):([0-9A-Za-z_-]{1,40})\)/g;

export type Mencionavel = { tipo: "pessoa" | "departamento"; id: string; nome: string };

export function tokenMencao(m: Mencionavel) {
  const nome = m.nome.replace(/[[\]]/g, "").slice(0, 80).trim();
  return `@[${nome}](${m.tipo === "pessoa" ? "u" : "d"}:${m.id})`;
}

/** Splits text into plain strings and mention chips for rendering. */
export function partesMencao(texto: string): ({ texto: string } | { nome: string; departamento: boolean })[] {
  const out: ({ texto: string } | { nome: string; departamento: boolean })[] = [];
  let i = 0;
  for (const m of texto.matchAll(MENCAO_RE)) {
    if (m.index! > i) out.push({ texto: texto.slice(i, m.index) });
    out.push({ nome: m[1], departamento: m[2] === "d" });
    i = m.index! + m[0].length;
  }
  if (i < texto.length) out.push({ texto: texto.slice(i) });
  return out;
}

const esc = (s: string) => s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");

/** Replaces tokens inside already-sanitized HTML with styled chips. */
export function mencoesEmHtml(html: string) {
  return html.replace(MENCAO_RE, (_t, nome: string, t: string) => `<span class="chip-mencao${t === "d" ? " is-depto" : ""}">@${esc(nome)}</span>`);
}

export async function buscarMencionaveis(busca: string): Promise<Mencionavel[]> {
  const { data, error } = await supabase.rpc("buscar_mencionaveis", { _busca: busca.trim() });
  if (error) throw error;
  return (data ?? []) as Mencionavel[];
}

export async function marcarMencaoLida(id: string) {
  await supabase.rpc("marcar_mencao_lida", { _id: id });
}
