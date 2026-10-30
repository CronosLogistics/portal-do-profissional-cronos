import type { ItemAnaliseNC } from "@/lib/pendencias.rules";

const GATEWAY_URL = "https://connector-gateway.lovable.dev";
const SITE = "cronoslogisticscombr.sharepoint.com,bab7a2b3-a0a2-4ade-8ae1-646c300682c8,6caaae7c-2a4d-4322-82a8-354fe45cfde2";
const LISTA_ANALISE_NC = "6939ea15-cf95-4870-894d-833b7b77cea5";
const LISTA_CONTROLE_NC = "5e86ef58-5d4f-4441-8f00-63ebeeedc744";
const LISTA_USUARIOS = "dcbf95ce-8b48-451e-b14f-eab5d8fa098f";
const CACHE_MS = 5 * 60 * 1000;

function headers() {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const graphKey = process.env["AZURE_GRAPH_API_KEY"];
  if (!lovableKey || !graphKey) throw new Error("Conexão com o Microsoft não configurada.");
  return { Authorization: `Bearer ${lovableKey}`, "X-Connection-Api-Key": graphKey, Prefer: "HonorNonIndexedQueriesWarningMayFailRandomly" };
}

async function lerTudo<T>(caminho: string): Promise<T[]> {
  let url: string | null = `${GATEWAY_URL}/azure_graph/v1.0${caminho}`;
  const all: T[] = [];
  for (let p = 0; url && p < 50; p++) {
    const res: Response = await fetch(url, { headers: headers() });
    if (!res.ok) {
      console.error(`SharePoint NC [${res.status}]: ${(await res.text()).slice(0, 300)}`);
      throw new Error(res.status === 403 ? "Sem permissão para ler as pendências de NC." : "Falha ao consultar as pendências de NC.");
    }
    const body = (await res.json()) as { value: T[]; "@odata.nextLink"?: string };
    all.push(...body.value);
    const next = body["@odata.nextLink"];
    if (next) {
      const u = new URL(next);
      if (u.hostname !== "graph.microsoft.com") throw new Error("Paginação inesperada do Microsoft.");
      url = `${GATEWAY_URL}/azure_graph${u.pathname}${u.search}`;
    } else url = null;
  }
  return all;
}

type Cache = { em: number; itens: ItemAnaliseNC[]; usuarios: Map<string, { email: string; nome: string }> };
let cache: Cache | null = null;
const ncTitulos = new Map<string, string>();

/** Análises de NC e usuários do site da Qualidade (cache curto, só no servidor). */
export async function dadosAnaliseNC(): Promise<Cache> {
  if (cache && Date.now() - cache.em < CACHE_MS) return cache;
  const [itens, users] = await Promise.all([
    lerTudo<ItemAnaliseNC>(`/sites/${SITE}/lists/${LISTA_ANALISE_NC}/items?$expand=fields($select=NCLookupId,Respons_x00e1_velLookupId,Created,Data_Fechamento,Situa_x00e7__x00e3_odaAn_x00e1_l)&$top=999`),
    lerTudo<{ id: string; fields: { EMail?: string; Title?: string } }>(`/sites/${SITE}/lists/${LISTA_USUARIOS}/items?$expand=fields($select=EMail,Title)&$top=999`),
  ]);
  const usuarios = new Map<string, { email: string; nome: string }>();
  for (const u of users) {
    if (u.fields.EMail || u.fields.Title) usuarios.set(u.id, { email: u.fields.EMail ?? "", nome: (u.fields.Title ?? "").replace(/\s*-\s*Cronos Logistics$/i, "").trim() });
  }
  cache = { em: Date.now(), itens, usuarios };
  return cache;
}

/** Número da NC (Título no Controle de NC) para os IDs pedidos. */
export async function titulosNC(ids: string[]): Promise<Map<string, string>> {
  const faltam = [...new Set(ids)].filter((id) => id && !ncTitulos.has(id));
  await Promise.all(
    faltam.map(async (id) => {
      const res = await fetch(`${GATEWAY_URL}/azure_graph/v1.0/sites/${SITE}/lists/${LISTA_CONTROLE_NC}/items/${encodeURIComponent(id)}?$expand=fields($select=Title)`, { headers: headers() });
      if (!res.ok) { console.error(`SharePoint NC título [${res.status}]: ${(await res.text()).slice(0, 200)}`); return; }
      const body = (await res.json()) as { fields?: { Title?: string } };
      if (body.fields?.Title) ncTitulos.set(id, body.fields.Title);
    }),
  );
  return ncTitulos;
}
