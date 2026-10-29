/** Regras puras dos avisos. Datas gravadas em UTC e exibidas no horário de Brasília (UTC-3, sem horário de verão). */
export type StatusAviso = "Agendado" | "Publicado" | "Expirado" | "Arquivado";

export type DatasAviso = { publicar_em: string; expira_em: string | null; arquivado_em: string | null };

export const TITULO_MAX = 120;
const OFFSET = "-03:00";
const TZ = "America/Sao_Paulo";

export function statusAviso(a: DatasAviso, agora: Date = new Date()): StatusAviso {
  if (a.arquivado_em) return "Arquivado";
  if (new Date(a.publicar_em) > agora) return "Agendado";
  if (a.expira_em && new Date(a.expira_em) <= agora) return "Expirado";
  return "Publicado";
}

/** "2026-10-23T23:30" digitado em Brasília -> ISO UTC. */
export function brasiliaParaUtc(local: string): string {
  return new Date(`${local}:00${OFFSET}`).toISOString();
}

/** ISO UTC -> valor do campo datetime-local no horário de Brasília. */
export function utcParaBrasilia(iso: string): string {
  const d = new Date(new Date(iso).getTime() - 3 * 3600_000);
  return d.toISOString().slice(0, 16);
}

export function formatarDataBrasilia(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", { timeZone: TZ, day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

/** Título da aba com o contador de não lidos, ex.: "(2) Portal do Profissional". */
export function tituloComContador(titulo: string, naoLidos: number): string {
  const base = titulo.replace(/^\(\d+\+?\)\s*/, "");
  return naoLidos > 0 ? `(${naoLidos > 99 ? "99+" : naoLidos}) ${base}` : base;
}

export function podeEditarAviso(status: StatusAviso) {
  return status === "Agendado" || status === "Publicado";
}

/** Cronos Day: fim do dia 12/12/2026, horário de Brasília. Fixo no código. */
export const CRONOS_DAY_FIM = new Date("2026-12-12T23:59:59.999-03:00");

/** Dias que faltam para o Cronos Day contados por data de Brasília; null a partir de 13/12/2026 (slide sai). */
export function diasParaCronosDay(agora: Date = new Date()): number | null {
  if (agora > CRONOS_DAY_FIM) return null;
  const hoje = new Date(agora.getTime() - 3 * 3600_000).toISOString().slice(0, 10);
  return Math.round((Date.UTC(2026, 11, 12) - Date.parse(`${hoje}T00:00:00Z`)) / 86_400_000);
}
