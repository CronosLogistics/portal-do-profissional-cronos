import { projetarDocumento, type DocumentoSharePoint, type ItemDocumentoGraph } from "./documentos-sharepoint.rules";

const BASE = "https://connector-gateway.lovable.dev/azure_graph";
const FONTES = [
  { categoria: "Qualidade", drive: "b!DI8muQSoGkSZGypNlJ1ZZ8NmMKVCIDlElMZ0B8pLfs7ygDbdT8ySQa9h3uLuAWAs", raiz: "items/01H7PBT66DHVBNF7ZCTNC3NZ7ZIQJMXYS2" },
  { categoria: "Modelo Documental", drive: "b!DI8muQSoGkSZGypNlJ1ZZ8NmMKVCIDlElMZ0B8pLfs57V_xm2h-TS6ZnNQBhR346", raiz: "items/01H7PBT6YPBX2ELLG6EFEL7ZKOLN5ZORKM" },
];
let cache: { expira: number; itens: DocumentoSharePoint[]; erros: string[] } | null = null;

export async function consultarDocumentosSharePoint(key: string, lovable: string) {
  if (cache && cache.expira > Date.now()) return cache;
  async function filhos(drive: string, raiz: string) {
    const itens: ItemDocumentoGraph[] = [];
    let path: string | null = `/v1.0/drives/${drive}/${raiz}/children?$select=id,name,webUrl,folder,file&$top=200`;
    for (let pagina = 0; path && pagina < 50; pagina++) {
      const response = await fetch(BASE + path, { headers: { Authorization: `Bearer ${lovable}`, "X-Connection-Api-Key": key } });
      if (!response.ok) {
        const body = await response.text();
        console.error(`Documentos SharePoint [${response.status}]: ${body}`);
        throw new Error(`SharePoint [${response.status}]: ${body}`);
      }
      const body = await response.json() as { value: ItemDocumentoGraph[]; "@odata.nextLink"?: string };
      itens.push(...body.value);
      path = null;
      if (body["@odata.nextLink"]) {
        const next = new URL(body["@odata.nextLink"]);
        if (next.origin !== "https://graph.microsoft.com" || !next.pathname.startsWith(`/v1.0/drives/${drive}/`)) throw new Error("Paginação inesperada do SharePoint.");
        path = next.pathname + next.search;
      }
    }
    if (path) throw new Error("Limite de páginas de documentos excedido.");
    return itens;
  }
  const resultados = await Promise.all(FONTES.map(async fonte => {
    const itens: DocumentoSharePoint[] = [];
    try {
      const fila = [{ raiz: fonte.raiz, pasta: "" }];
      for (let indice = 0; indice < fila.length; indice++) {
        if (indice >= 500) throw new Error("Limite de pastas excedido.");
        const atual = fila[indice];
        if (!atual) break;
        for (const item of await filhos(fonte.drive, atual.raiz)) {
          if (item.folder) fila.push({ raiz: `items/${encodeURIComponent(item.id)}`, pasta: [atual.pasta, item.name].filter(Boolean).join(" / ") });
          const documento = projetarDocumento(item, fonte.categoria, atual.pasta);
          if (documento) itens.push(documento);
        }
      }
      return { itens, erro: null };
    } catch (error) {
      console.error(`Documentos ${fonte.categoria}:`, error);
      return { itens, erro: `Não foi possível consultar todos os documentos de ${fonte.categoria}. Tente novamente.` };
    }
  }));
  const itens = resultados.flatMap(r => r.itens).sort((a, b) => a.titulo.localeCompare(b.titulo, "pt-BR"));
  const erros = resultados.flatMap(r => r.erro ? [r.erro] : []);
  const resultado = { itens, erros, expira: Date.now() + 60_000 };
  if (erros.length === 0) cache = resultado;
  return resultado;
}