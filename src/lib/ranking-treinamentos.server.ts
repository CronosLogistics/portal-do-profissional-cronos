/** Lista "Pontuação Final por Profissional - Semestral" (Gestão de Pessoas): Title = e-mail, total de pontos. */
const SITE = "cronoslogisticscombr.sharepoint.com,dc6d3de3-d3ee-4d0d-b0ba-b86afc2f715c,6caaae7c-2a4d-4322-82a8-354fe45cfde2";
const LISTA = "887d02b2-e357-41bb-acf2-2b9b4f70eb41";
const GATEWAY = "https://connector-gateway.lovable.dev/azure_graph";

export type LinhaPontuacao = { email: string; pontos: number; ano: string; semestre: string };
type Item = { fields: { Title?: string; TotaldePontua_x00e7__x00e3_o?: number | string; Ano?: number | string; Semestre?: number | string } };

let cache: { em: number; linhas: LinhaPontuacao[] } | null = null;

export async function pontuacoesSemestre(): Promise<LinhaPontuacao[]> {
  if (cache && Date.now() - cache.em < 20 * 60_000) return cache.linhas;
  const key = process.env["LOVABLE_API_KEY"], graph = process.env["AZURE_GRAPH_API_KEY"];
  if (!key || !graph) throw new Error("Conexão Microsoft indisponível.");
  const url = `${GATEWAY}/v1.0/sites/${SITE}/lists/${LISTA}/items?$expand=fields($select=Title,TotaldePontua_x00e7__x00e3_o,Ano,Semestre)&$top=999`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${key}`, "X-Connection-Api-Key": graph }, signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`Não foi possível ler a pontuação [${res.status}]: ${await res.text()}`);
  const data = (await res.json()) as { value: Item[] };
  const linhas = data.value
    .map((i) => ({ email: (i.fields.Title ?? "").trim().toLowerCase(), pontos: Number(i.fields.TotaldePontua_x00e7__x00e3_o ?? 0), ano: String(i.fields.Ano ?? ""), semestre: String(i.fields.Semestre ?? "") }))
    .filter((l) => l.email.includes("@") && Number.isFinite(l.pontos));
  cache = { em: Date.now(), linhas };
  return linhas;
}
