import { feriasDosAtivos, type FeriasColaborador, type ItemFerias } from "./ferias.rules";

const SITE = "cronoslogisticscombr.sharepoint.com,dc6d3de3-d3ee-4d0d-b0ba-b86afc2f715c,6caaae7c-2a4d-4322-82a8-354fe45cfde2";
const BASE = "https://connector-gateway.lovable.dev/azure_graph";
let cache: { expira: number; itens: FeriasColaborador[] } | null = null;

async function ler<T>(path: string): Promise<T[]> {
  const key = process.env["AZURE_GRAPH_API_KEY"];
  const lovable = process.env["LOVABLE_API_KEY"];
  if (!key || !lovable) throw new Error("Conexão com o Microsoft não configurada.");
  let url: string | null = BASE + path;
  const itens: T[] = [];
  for (let pagina = 0; url && pagina < 50; pagina++) {
    const response: Response = await fetch(url, { headers: { Authorization: `Bearer ${lovable}`, "X-Connection-Api-Key": key } });
    if (!response.ok) {
      const body = await response.text();
      console.error(`SharePoint Férias [${response.status}]: ${body}`);
      throw new Error(`Consulta de férias indisponível (${response.status}).`);
    }
    const body = await response.json() as { value: T[]; "@odata.nextLink"?: string };
    itens.push(...body.value);
    const next = body["@odata.nextLink"];
    if (!next) { url = null; continue; }
    const u = new URL(next);
    if (u.hostname !== "graph.microsoft.com" || u.protocol !== "https:") throw new Error("Paginação inesperada do Microsoft.");
    url = BASE + u.pathname + u.search;
  }
  if (url) throw new Error("A consulta de férias excedeu o limite de páginas.");
  return itens;
}

export async function consultarFerias() {
  if (cache && cache.expira > Date.now()) return cache.itens;
  const [itens, users] = await Promise.all([
    ler<ItemFerias>(`/v1.0/sites/${SITE}/lists/862481b1-77c6-4f93-9274-1e1e5848edea/items?$select=id&$expand=fields($select=Title,Inicio,Fim,Dias,Retorno,DiasExtrasdeAus_x00ea_ncia,DatadeRetornocomDiasExtras,StatusProfissional,Status_x0020_Semana_x0020_F_x00e,SuplenteLookupId)&$top=999`),
    ler<{ id: string; fields: { Title?: string } }>(`/v1.0/sites/${SITE}/lists/dcbf95ce-8b48-451e-b14f-eab5d8fa098f/items?$select=id&$expand=fields($select=Title)&$top=999`),
  ]);
  const usuarios = new Map(users.map(u => [u.id, (u.fields.Title ?? "").replace(/\s*-\s*Cronos Logistics$/i, "").trim()]));
  const resultado = feriasDosAtivos(itens, usuarios);
  cache = { expira: Date.now() + 60_000, itens: resultado };
  return resultado;
}