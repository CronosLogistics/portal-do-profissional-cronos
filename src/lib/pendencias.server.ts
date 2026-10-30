import type { ItemAnaliseNC } from "@/lib/pendencias.rules";

const GATEWAY_URL = "https://connector-gateway.lovable.dev";
const SITE = "cronoslogisticscombr.sharepoint.com,bab7a2b3-a0a2-4ade-8ae1-646c300682c8,6caaae7c-2a4d-4322-82a8-354fe45cfde2";
const LISTA_ANALISE_NC = "6939ea15-cf95-4870-894d-833b7b77cea5";
const LISTA_ANALISE_NC_MAIOR = "92eedf3a-6d16-4d73-b7c0-132b571ced67";
const LISTA_PLANO_ACAO = "34afa699-bcd4-4a7a-a5f2-c083fd9ca2e2";
const LISTA_CONTROLE_NC = "5e86ef58-5d4f-4441-8f00-63ebeeedc744";
const LISTA_ANALISE_SM = "909379e8-f01d-4332-9194-c2ba9a6abfc6";
const LISTA_PLANO_SM = "d39939ba-91a8-4bc7-8ba1-0b2036e79544";
const LISTA_NPS = "895f8afb-e289-4c27-87d0-444a9eaa7bec";
const LISTA_CONTROLE_SM = "c14d869d-23e8-4cf1-b800-617a03141db3";
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

type Cache = { em: number; itens: ItemAnaliseNC[]; itensMaior: ItemAnaliseNC[]; itensPlano: ItemAnaliseNC[]; itensSM: ItemAnaliseNC[]; itensPlanoSM: ItemAnaliseNC[]; itensNPS: ItemAnaliseNC[]; usuarios: Map<string, { email: string; nome: string }> };
let cache: Cache | null = null;
const ncTitulos = new Map<string, string>();
const smTitulos = new Map<string, string>();

/** Análises de NC e usuários do site da Qualidade (cache curto, só no servidor). */
export async function dadosAnaliseNC(): Promise<Cache> {
  if (cache && Date.now() - cache.em < CACHE_MS) return cache;
  const [itens, itensMaior, itensPlano, itensSM, itensPlanoSM, itensNPS, users] = await Promise.all([
    lerTudo<ItemAnaliseNC>(`/sites/${SITE}/lists/${LISTA_ANALISE_NC}/items?$expand=fields($select=NCLookupId,Respons_x00e1_velLookupId,Created,Data_Fechamento,Situa_x00e7__x00e3_odaAn_x00e1_l)&$top=999`),
    lerTudo<ItemAnaliseNC>(`/sites/${SITE}/lists/${LISTA_ANALISE_NC_MAIOR}/items?$expand=fields($select=NCLookupId,Respons_x00e1_velLookupId,Created,Data_Fechamento,StatusAn_x00e1_liseMaior)&$top=999`),
    lerTudo<ItemAnaliseNC>(`/sites/${SITE}/lists/${LISTA_PLANO_ACAO}/items?$expand=fields($select=NCLookupId,Respons_x00e1_velLookupId,GestorRespons_x00e1_velLookupId,Prazo,Status,Essaa_x00e7__x00e3_oest_x00e1_fi)&$top=999`),
    lerTudo<ItemAnaliseNC>(`/sites/${SITE}/lists/${LISTA_ANALISE_SM}/items?$expand=fields($select=NCLookupId,Respons_x00e1_velLookupId,Created,Data_Fechamento,Etapa)&$top=999`),
    lerTudo<ItemAnaliseNC>(`/sites/${SITE}/lists/${LISTA_PLANO_SM}/items?$expand=fields($select=NCLookupId,Respons_x00e1_velLookupId,GestorRespons_x00e1_velLookupId,Prazo,Status,Conclu_x00ed_do_x003f_)&$top=999`),
    lerTudo<ItemAnaliseNC>(`/sites/${SITE}/lists/${LISTA_NPS}/items?$expand=fields($select=Title,Processo,Nota,Status,Respons_x00e1_velpeloNPS_x0028_gLookupId)&$top=999`),
    lerTudo<{ id: string; fields: { EMail?: string; Title?: string } }>(`/sites/${SITE}/lists/${LISTA_USUARIOS}/items?$expand=fields($select=EMail,Title)&$top=999`),
  ]);
  const usuarios = new Map<string, { email: string; nome: string }>();
  for (const u of users) {
    if (u.fields.EMail || u.fields.Title) usuarios.set(u.id, { email: u.fields.EMail ?? "", nome: (u.fields.Title ?? "").replace(/\s*-\s*Cronos Logistics$/i, "").trim() });
  }
  cache = { em: Date.now(), itens, itensMaior, itensPlano, itensSM, itensPlanoSM, itensNPS, usuarios };
  return cache;
}

/** Número da NC (Título no Controle de NC) para os IDs pedidos. */
export async function titulosNC(ids: string[], sm = false): Promise<Map<string, string>> {
  const mapa = sm ? smTitulos : ncTitulos;
  const lista = sm ? LISTA_CONTROLE_SM : LISTA_CONTROLE_NC;
  const faltam = [...new Set(ids)].filter((id) => id && !mapa.has(id));
  await Promise.all(
    faltam.map(async (id) => {
      const res = await fetch(`${GATEWAY_URL}/azure_graph/v1.0/sites/${SITE}/lists/${lista}/items/${encodeURIComponent(id)}?$expand=fields($select=Title)`, { headers: headers() });
      if (!res.ok) { console.error(`SharePoint NC título [${res.status}]: ${(await res.text()).slice(0, 200)}`); return; }
      const body = (await res.json()) as { fields?: { Title?: string } };
      if (body.fields?.Title) mapa.set(id, body.fields.Title);
    }),
  );
  return mapa;
}
