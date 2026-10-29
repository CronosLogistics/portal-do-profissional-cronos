import { escritorioDoEmail, type ProfissionalEscritorio } from "./office.rules";
const SITE = "cronoslogisticscombr.sharepoint.com,dc6d3de3-d3ee-4d0d-b0ba-b86afc2f715c,6caaae7c-2a4d-4322-82a8-354fe45cfde2";
async function ler<T>(path: string): Promise<T[]> {
  const key = process.env["LOVABLE_API_KEY"], graph = process.env["AZURE_GRAPH_API_KEY"];
  if (!key || !graph) throw new Error("Conexão Microsoft indisponível.");
  const gateway = "https://connector-gateway.lovable.dev/azure_graph";
  let url: string | null = `${gateway}/v1.0/sites/${SITE}/${path}`;
  const rows: T[] = [];
  for (let i = 0; url && i < 20; i++) {
    const res: Response = await fetch(url, { headers: { Authorization: `Bearer ${key}`, "X-Connection-Api-Key": graph }, signal: AbortSignal.timeout(20000) });
    if (!res.ok) throw new Error(`Não foi possível identificar o escritório Microsoft [${res.status}].`);
    const data = await res.json() as { value: T[]; "@odata.nextLink"?: string };
    rows.push(...data.value);
    if (data["@odata.nextLink"]) { const next = new URL(data["@odata.nextLink"]); if (next.hostname !== "graph.microsoft.com" || !next.pathname.startsWith(`/v1.0/sites/${SITE}/`)) throw new Error("Paginação inesperada."); url = `${gateway}${next.pathname}${next.search}`; } else url = null;
  }
  if (url) throw new Error("Consulta incompleta de escritório.");
  return rows;
}
export async function buscarEscritorio(email: string) {
  const [rows, users] = await Promise.all([
    ler<ProfissionalEscritorio>("lists/0e37d734-d94f-4832-9802-d3c2e7daf395/items?$select=id&$expand=fields($select=field_1,field_3,E_x002d_MAILCORPORATIVOLookupId)&$top=500"),
    ler<{ id: string; fields: { EMail?: string } }>("lists/dcbf95ce-8b48-451e-b14f-eab5d8fa098f/items?$select=id&$expand=fields($select=EMail)&$top=500"),
  ]);
  return escritorioDoEmail(rows, new Map(users.map(u => [u.id, u.fields.EMail ?? ""])), email);
}