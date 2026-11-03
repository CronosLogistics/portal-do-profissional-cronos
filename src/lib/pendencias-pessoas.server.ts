import { LISTAS_PESSOAS, type TipoPendenciaPessoas, type PessoaSharePoint } from "./pendencias-pessoas.rules";
import type { ItemAnaliseNC } from "./pendencias.rules";

const SITE = "cronoslogisticscombr.sharepoint.com,dc6d3de3-d3ee-4d0d-b0ba-b86afc2f715c,6caaae7c-2a4d-4322-82a8-354fe45cfde2";
const BASE = "https://connector-gateway.lovable.dev/azure_graph";

async function ler<T>(path: string): Promise<T[]> {
  const key = process.env["AZURE_GRAPH_API_KEY"];
  const lovable = process.env["LOVABLE_API_KEY"];
  if (!key || !lovable) throw new Error("Conexão com o Microsoft não configurada.");
  let url: string | null = BASE + path;
  const itens: T[] = [];
  for (let pagina = 0; url && pagina < 50; pagina++) {
    const r: Response = await fetch(url, { headers: { Authorization: `Bearer ${lovable}`, "X-Connection-Api-Key": key } });
    if (!r.ok) {
      const body = await r.text();
      console.error(`SharePoint Gestão de Pessoas [${r.status}]: ${body}`);
      throw new Error(`Falha ao consultar Gestão de Pessoas no SharePoint (${r.status}).`);
    }
    const body = await r.json() as { value: T[]; "@odata.nextLink"?: string };
    itens.push(...body.value);
    const next = body["@odata.nextLink"];
    if (!next) { url = null; continue; }
    const u = new URL(next);
    if (u.hostname !== "graph.microsoft.com") throw new Error("Paginação inesperada do Microsoft.");
    url = BASE + u.pathname + u.search;
  }
  if (url) throw new Error("A consulta de Gestão de Pessoas excedeu o limite de páginas.");
  return itens;
}

export async function dadosPendenciasPessoas() {
  const tipos = Object.keys(LISTAS_PESSOAS) as TipoPendenciaPessoas[];
  const users = await ler<{ id: string; fields: { EMail?: string; Title?: string } }>(`/v1.0/sites/${SITE}/lists/dcbf95ce-8b48-451e-b14f-eab5d8fa098f/items?$expand=fields($select=EMail,Title)&$top=999`);
  const usuarios = new Map<string, PessoaSharePoint>(users.map(u => [u.id, { email: u.fields.EMail ?? "", nome: (u.fields.Title ?? "").replace(/\s*-\s*Cronos Logistics$/i, "").trim() }]));
  const listas = {} as Record<TipoPendenciaPessoas, ItemAnaliseNC[]>;
  const erros: Partial<Record<TipoPendenciaPessoas, string>> = {};
  // Pares limitam o número de consultas simultâneas; uma lista indisponível não bloqueia as outras.
  for (let inicio = 0; inicio < tipos.length; inicio += 2) {
    await Promise.all(tipos.slice(inicio, inicio + 2).map(async tipo => {
      const cfg = LISTAS_PESSOAS[tipo];
      try { listas[tipo] = await ler<ItemAnaliseNC>(`/v1.0/sites/${SITE}/lists/${cfg.id}/items?$expand=fields($select=${cfg.campos.join(",")})&$top=999`); }
      catch (e) { listas[tipo] = []; erros[tipo] = e instanceof Error ? e.message : "Falha ao consultar esta lista."; }
    }));
  }
  return { listas, usuarios, erros };
}