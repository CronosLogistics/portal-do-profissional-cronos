import { urlBaseLista, type ResponsavelEscritorio } from "./inventario.rules";

const GATEWAY = "https://connector-gateway.lovable.dev/azure_graph/v1.0";
const SITE = "cronoslogisticscombr.sharepoint.com,1a32e0ca-9469-429d-9f61-bf492122b324,a4155652-d1f3-4262-a77e-6c1b09566e1e";
const LISTA_RESPONSAVEIS = "6371be68-3b53-4042-9b78-0e131020b3b6";
const SISTEMA = new Set(["ContentType", "Attachments", "ComplianceAssetId", "LinkTitle", "LinkTitleNoMenu", "Edit", "DocIcon", "ID"]);

async function graph<T>(path: string): Promise<T> {
  const key = process.env["LOVABLE_API_KEY"], g = process.env["AZURE_GRAPH_API_KEY"];
  if (!key || !g) throw new Error("Conexão Microsoft indisponível.");
  const res = await fetch(`${GATEWAY}${path}`, { headers: { Authorization: `Bearer ${key}`, "X-Connection-Api-Key": g }, signal: AbortSignal.timeout(20000) });
  if (!res.ok) { const b = await res.text(); console.error(`[inventario] Graph [${res.status}]: ${b}`); throw new Error(`Falha ao consultar o SharePoint [${res.status}].`); }
  return (await res.json()) as T;
}

let cacheResp: { em: number; dados: ResponsavelEscritorio[] } | null = null;
export async function responsaveisEscritorios(): Promise<ResponsavelEscritorio[]> {
  if (cacheResp && Date.now() - cacheResp.em < 5 * 60_000) return cacheResp.dados;
  type F = Record<string, unknown>;
  const [itens, usuarios] = await Promise.all([
    graph<{ value: { id: string; fields: F }[] }>(`/sites/${SITE}/lists/${LISTA_RESPONSAVEIS}/items?$expand=fields&$top=999`),
    graph<{ value: { id: string; fields: F }[] }>(`/sites/${SITE}/lists/ea8d6695-fa0d-4b3f-8de3-6f2fe783a970/items?$expand=fields($select=EMail)&$top=999`),
  ]);
  const emails = new Map(usuarios.value.map((u) => [u.id, String(u.fields["EMail"] ?? "").trim().toLowerCase()]));
  const dados = itens.value.map((i) => {
    const link = i.fields["LinkdoInvent_x00e1_rio"] as { Url?: string } | undefined;
    return { id: i.id, titulo: String(i.fields["Title"] ?? ""), escritorio: String(i.fields["Escrit_x00f3_rio"] ?? ""), email: emails.get(String(i.fields["CoordenadorLookupId"] ?? "")) ?? "", link: link?.Url ?? null };
  });
  cacheResp = { em: Date.now(), dados };
  return dados;
}

export type ColunaInventario = { nome: string; titulo: string; tipo: "texto" | "numero" | "moeda" | "data" };
export type Inventario = { id: string; titulo: string; escritorio: string; colunas: ColunaInventario[]; linhas: Record<string, string>[]; erro: string | null };

type Coluna = { name: string; displayName: string; hidden?: boolean; readOnly?: boolean; columnGroup?: string; currency?: unknown; number?: unknown; dateTime?: unknown; calculated?: unknown };

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
function formatar(v: unknown, tipo: ColunaInventario["tipo"]): string {
  if (v === null || v === undefined || v === "") return "";
  if (tipo === "moeda" && typeof v === "number") return brl.format(v);
  if (tipo === "numero" && typeof v === "number") return v.toLocaleString("pt-BR");
  if (tipo === "data" && typeof v === "string") { const d = new Date(v); return isNaN(+d) ? v : d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }); }
  return typeof v === "object" ? "" : String(v);
}

let cacheListas: { em: number; mapa: Map<string, string> } | null = null;
async function idPorUrl(url: string): Promise<string | null> {
  if (!cacheListas || Date.now() - cacheListas.em > 10 * 60_000) {
    const ls = await graph<{ value: { id: string; webUrl: string }[] }>(`/sites/${SITE}/lists?$select=id,webUrl&$top=999`);
    cacheListas = { em: Date.now(), mapa: new Map(ls.value.map((l) => [urlBaseLista(l.webUrl), l.id])) };
  }
  return cacheListas.mapa.get(urlBaseLista(url)) ?? null;
}

/** Lê colunas e registros reais da lista indicada no "Link do Inventário" — somente consulta. */
export async function lerInventario(r: ResponsavelEscritorio): Promise<Inventario> {
  const base = { id: r.id, titulo: r.titulo, escritorio: r.escritorio };
  try {
    const lista = r.link ? await idPorUrl(r.link) : null;
    if (!lista) return { ...base, colunas: [], linhas: [], erro: "Lista do inventário não encontrada no SharePoint." };
    const [cols, itens] = await Promise.all([
      graph<{ value: Coluna[] }>(`/sites/${SITE}/lists/${lista}/columns`),
      graph<{ value: { fields: Record<string, unknown> }[] }>(`/sites/${SITE}/lists/${lista}/items?$expand=fields&$top=999`),
    ]);
    const colunas: ColunaInventario[] = cols.value
      .filter((c) => !c.hidden && c.columnGroup !== "_Hidden" && !c.name.startsWith("_") && !SISTEMA.has(c.name) && (!c.readOnly || c.calculated))
      .map((c) => ({ nome: c.name, titulo: c.displayName, tipo: c.currency ? "moeda" : c.number ? "numero" : c.dateTime ? "data" : "texto" }));
    const linhas = itens.value.map((i) => Object.fromEntries(colunas.map((c) => [c.nome, formatar(i.fields[c.nome], c.tipo)])));
    return { ...base, colunas, linhas, erro: null };
  } catch (e) {
    console.error("[inventario]", e);
    return { ...base, colunas: [], linhas: [], erro: "Não foi possível carregar este inventário agora." };
  }
}
