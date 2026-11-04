export type DocumentoSharePoint = { id: string; titulo: string; url: string; categoria: string; pasta: string };
export type ItemDocumentoGraph = { id: string; name: string; webUrl: string; folder?: { childCount?: number }; file?: { mimeType?: string } };

export function projetarDocumento(item: ItemDocumentoGraph, categoria: string, pasta: string): DocumentoSharePoint | null {
  if (!item.file || item.folder) return null;
  const url = new URL(item.webUrl);
  if (url.protocol !== "https:" || url.hostname !== "cronoslogisticscombr.sharepoint.com") return null;
  return { id: item.id, titulo: item.name, url: item.webUrl, categoria, pasta };
}

export function filtrarDocumentos(itens: DocumentoSharePoint[], busca: string, categoria?: string) {
  const normalizar = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
  const termo = normalizar(busca.trim());
  return itens.filter(d => (!categoria || d.categoria === categoria) && normalizar(`${d.titulo} ${d.pasta} ${d.categoria}`).includes(termo));
}