/** Leitura server-side do Controle de Saldos de férias (SharePoint Gestão de Pessoas). */
import type { ItemSaldo } from "./saldo-ferias.rules";

const SITE = "cronoslogisticscombr.sharepoint.com,dc6d3de3-d3ee-4d0d-b0ba-b86afc2f715c,6caaae7c-2a4d-4322-82a8-354fe45cfde2";
const LISTA = "6ed52a0e-b226-468e-aa2a-a08751050db7";
const BASE = "https://connector-gateway.lovable.dev/azure_graph";
const CAMPOS = "NomeLookupId,Status,Situa_x00e7__x00e3_o,Ano_x0020_Direito,Dias_x0020_Concedidos,DiasGozados,Dias_x0020_Restantes,Per_x00ed_odo,DatadeDireito,LimitedoGozo,Regime";
let cache: { expira: number; itens: ItemSaldo[] } | null = null;

export async function itensSaldoFerias(): Promise<ItemSaldo[]> {
  if (cache && cache.expira > Date.now()) return cache.itens;
  const key = process.env["AZURE_GRAPH_API_KEY"];
  const lovable = process.env["LOVABLE_API_KEY"];
  if (!key || !lovable) throw new Error("Conexão com o Microsoft não configurada.");
  let url: string | null = `${BASE}/v1.0/sites/${SITE}/lists/${LISTA}/items?$select=id&$expand=fields($select=${CAMPOS})&$top=999`;
  const itens: ItemSaldo[] = [];
  for (let pagina = 0; url && pagina < 50; pagina++) {
    const res: Response = await fetch(url, { headers: { Authorization: `Bearer ${lovable}`, "X-Connection-Api-Key": key }, signal: AbortSignal.timeout(20000) });
    if (!res.ok) {
      console.error(`SharePoint Saldo de Férias [${res.status}]: ${await res.text()}`);
      throw new Error(`Consulta de saldo de férias indisponível (${res.status}).`);
    }
    const body = (await res.json()) as { value: ItemSaldo[]; "@odata.nextLink"?: string };
    itens.push(...body.value);
    const next = body["@odata.nextLink"];
    if (!next) { url = null; continue; }
    const u = new URL(next);
    if (u.hostname !== "graph.microsoft.com" || u.protocol !== "https:") throw new Error("Paginação inesperada do Microsoft.");
    url = BASE + u.pathname + u.search;
  }
  if (url) throw new Error("A consulta de saldo de férias excedeu o limite de páginas.");
  cache = { expira: Date.now() + 5 * 60_000, itens };
  return itens;
}
