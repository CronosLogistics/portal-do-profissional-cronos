import type { ItemLista } from "@/lib/feedback.rules";

const GATEWAY_URL = "https://connector-gateway.lovable.dev";
const SITE = "cronoslogisticscombr.sharepoint.com,bab7a2b3-a0a2-4ade-8ae1-646c300682c8,6caaae7c-2a4d-4322-82a8-354fe45cfde2";
const LISTA = "c14d869d-23e8-4cf1-b800-617a03141db3";
const LISTA_USUARIOS = "dcbf95ce-8b48-451e-b14f-eab5d8fa098f";
const CACHE_MS = 5 * 60 * 1000;

type Cache = { em: number; itens: ItemLista[]; usuarios: Map<string, { email: string; nome: string }> };
let cache: Cache | null = null;

async function lerTudo<T>(caminho: string, extra: Record<string, string> = {}): Promise<T[]> {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const graphKey = process.env["AZURE_GRAPH_API_KEY"];
  if (!lovableKey || !graphKey) throw new Error("Conexão com o Microsoft não configurada.");
  const headers = { Authorization: `Bearer ${lovableKey}`, "X-Connection-Api-Key": graphKey, ...extra };
  let url: string | null = `${GATEWAY_URL}/azure_graph/v1.0${caminho}`;
  const all: T[] = [];
  for (let p = 0; url && p < 50; p++) {
    const res: Response = await fetch(url, { headers });
    if (!res.ok) {
      console.error(`SharePoint [${res.status}]: ${(await res.text()).slice(0, 300)}`);
      throw new Error(res.status === 403 ? "Sem permissão para ler a lista de elogios." : "Falha ao consultar a lista de elogios.");
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

/** Lê os elogios e os usuários do site (com cache curto no servidor). Nunca vai ao navegador. */
export async function dadosElogios(): Promise<Cache> {
  if (cache && Date.now() - cache.em < CACHE_MS) return cache;
  const filtro = encodeURIComponent("fields/field_4 eq 'Elogio - EL'");
  const [itens, users] = await Promise.all([
    lerTudo<ItemLista>(`/sites/${SITE}/lists/${LISTA}/items?$expand=fields&$top=999&$filter=${filtro}`, {
      Prefer: "HonorNonIndexedQueriesWarningMayFailRandomly",
    }),
    lerTudo<{ id: string; fields: { EMail?: string; Title?: string } }>(
      `/sites/${SITE}/lists/${LISTA_USUARIOS}/items?$expand=fields($select=EMail,Title)&$top=999`,
    ),
  ]);
  const usuarios = new Map<string, { email: string; nome: string }>();
  for (const u of users) {
    if (u.fields.EMail) usuarios.set(u.id, { email: u.fields.EMail, nome: (u.fields.Title ?? "").replace(/\s*-\s*Cronos Logistics$/i, "") });
  }
  cache = { em: Date.now(), itens, usuarios };
  return cache;
}
