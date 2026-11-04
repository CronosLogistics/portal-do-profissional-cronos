import { projetarDocumento, type DocumentoSharePoint, type ItemDocumentoGraph } from "./documentos-sharepoint.rules";

const BASE = "https://connector-gateway.lovable.dev/azure_graph";
const FONTES = [
  { categoria: "Qualidade", drive: "b!DI8muQSoGkSZGypNlJ1ZZ8NmMKVCIDlElMZ0B8pLfs7ygDbdT8ySQa9h3uLuAWAs", raiz: "items/01H7PBT66DHVBNF7ZCTNC3NZ7ZIQJMXYS2" },
  { categoria: "Modelo Documental", drive: "b!DI8muQSoGkSZGypNlJ1ZZ8NmMKVCIDlElMZ0B8pLfs57V_xm2h-TS6ZnNQBhR346", raiz: "items/01H7PBT6YPBX2ELLG6EFEL7ZKOLN5ZORKM" },
];
let cache: { expira: number; itens: DocumentoSharePoint[]; erros: string[] } | null = null;

export async function consultarDocumentosSharePoint(key: string, lovable: string) {
  if (cache && cache.expira > Date.now()) return cache;
  async function lote(paths: string[]) {
      const response = await fetch(BASE + "/v1.0/$batch", { method: "POST", headers: { Authorization: `Bearer ${lovable}`, "X-Connection-Api-Key": key, "Content-Type": "application/json" }, body: JSON.stringify({ requests: paths.map((url, id) => ({ id: String(id), method: "GET", url })) }), signal: AbortSignal.timeout(45_000) });
      if (!response.ok) {
        const body = await response.text();
        console.error(`Documentos SharePoint [${response.status}]: ${body}`);
        throw new Error(`SharePoint [${response.status}]: ${body}`);
      }
      const body = await response.json() as { responses: { id: string; status: number; body: { value?: ItemDocumentoGraph[]; "@odata.nextLink"?: string; error?: unknown } }[] };
      return paths.map((_, id) => {
        const result = body.responses.find(r => r.id === String(id));
        if (!result || result.status !== 200) throw new Error(`SharePoint [${result?.status}]: ${JSON.stringify(result?.body)}`);
        return result.body;
      });
  }
  const resultados = await Promise.all(FONTES.map(async fonte => {
    const itens: DocumentoSharePoint[] = [];
    try {
      const caminho = (raiz: string) => `/drives/${fonte.drive}/${raiz}/children?$select=id,name,webUrl,folder,file&$top=200`;
      const fila = [{ path: caminho(fonte.raiz), pasta: "" }];
      let consultas = 0;
      while (fila.length) {
        if (consultas > 2000) throw new Error("Limite de pastas excedido.");
        const grupo = fila.splice(0, 20);
        consultas += grupo.length;
        const respostas = await lote(grupo.map(g => g.path));
        respostas.forEach((body, indice) => {
          const atual = grupo[indice];
          if (!atual) return;
          if (body["@odata.nextLink"]) {
            const next = new URL(body["@odata.nextLink"]);
            if (next.origin !== "https://graph.microsoft.com" || !next.pathname.startsWith(`/v1.0/drives/${fonte.drive}/`)) throw new Error("Paginação inesperada do SharePoint.");
            fila.push({ path: next.pathname.replace(/^\/v1\.0/, "") + next.search, pasta: atual.pasta });
          }
          for (const item of body.value ?? []) {
          if (item.folder) fila.push({ path: caminho(`items/${encodeURIComponent(item.id)}`), pasta: [atual.pasta, item.name].filter(Boolean).join(" / ") });
          const documento = projetarDocumento(item, fonte.categoria, atual.pasta);
          if (documento) itens.push(documento);
          }
        });
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