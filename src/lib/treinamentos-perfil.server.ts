/** Treinamentos/certificados do profissional: lista "01 - Treinamentos" (Gestão de Pessoas), itens aprovados criados pela própria pessoa. */
import { normalizarEmail } from "./departamentos.rules";

const SITE = "cronoslogisticscombr.sharepoint.com,dc6d3de3-d3ee-4d0d-b0ba-b86afc2f715c,6caaae7c-2a4d-4322-82a8-354fe45cfde2";
const LISTA = "338f09f0-7aa4-46b2-96cc-7b5273ec402f";
const GATEWAY = "https://connector-gateway.lovable.dev/azure_graph";

export type TreinamentoPerfil = { id: string; titulo: string; detalhe: string; tipo: "certificado" | "treinamento"; data: string | null };
type Item = { id: string; createdBy?: { user?: { email?: string } }; fields: { Title?: string; Status?: string; Attachments?: boolean; Created?: string; TempodeDura_x00e7__x00e3_o?: number; Classifica_x00e7__x00e3_o?: string; Local_x002f_Institui_x00e7__x00e?: string } };

let cache: { em: number; itens: Item[] } | null = null;

async function lerTudo(): Promise<Item[]> {
  const key = process.env["LOVABLE_API_KEY"], graph = process.env["AZURE_GRAPH_API_KEY"];
  if (!key || !graph) throw new Error("Conexão Microsoft indisponível.");
  let url: string | null = `${GATEWAY}/v1.0/sites/${SITE}/lists/${LISTA}/items?$select=id,createdBy&$expand=fields($select=Title,Status,Attachments,Created,TempodeDura_x00e7__x00e3_o,Classifica_x00e7__x00e3_o,Local_x002f_Institui_x00e7__x00e)&$top=500`;
  const rows: Item[] = [];
  for (let i = 0; url && i < 20; i++) {
    const res: Response = await fetch(url, { headers: { Authorization: `Bearer ${key}`, "X-Connection-Api-Key": graph }, signal: AbortSignal.timeout(20000) });
    if (!res.ok) throw new Error(`Não foi possível ler os treinamentos [${res.status}].`);
    const data = (await res.json()) as { value: Item[]; "@odata.nextLink"?: string };
    rows.push(...data.value);
    if (data["@odata.nextLink"]) {
      const next = new URL(data["@odata.nextLink"]);
      if (next.hostname !== "graph.microsoft.com" || !next.pathname.startsWith(`/v1.0/sites/${SITE}/`)) throw new Error("Paginação inesperada.");
      url = `${GATEWAY}${next.pathname}${next.search}`;
    } else url = null;
  }
  return rows;
}

export async function treinamentosDoEmail(email: string): Promise<TreinamentoPerfil[]> {
  if (!cache || Date.now() - cache.em > 15 * 60_000) cache = { em: Date.now(), itens: await lerTudo() };
  const alvo = normalizarEmail(email);
  return cache.itens
    .filter((i) => normalizarEmail(i.createdBy?.user?.email ?? "") === alvo && i.fields.Status?.trim().toLowerCase() === "aprovado" && i.fields.Title?.trim())
    .map((i) => {
      const f = i.fields;
      const horas = f.TempodeDura_x00e7__x00e3_o ? `${f.TempodeDura_x00e7__x00e3_o}h` : null;
      const ano = f.Created ? new Date(f.Created).toLocaleDateString("pt-BR", { month: "short", year: "numeric", timeZone: "America/Sao_Paulo" }) : null;
      return {
        id: i.id, titulo: f.Title!.trim(),
        detalhe: [f.Local_x002f_Institui_x00e7__x00e?.trim(), horas, ano].filter(Boolean).join(" · ") || (f.Classifica_x00e7__x00e3_o ?? ""),
        // Anexo na linha = certificado enviado pelo profissional.
        tipo: f.Attachments ? "certificado" : "treinamento",
        data: f.Created ?? null,
      } satisfies TreinamentoPerfil;
    })
    .sort((a, b) => (b.data ?? "").localeCompare(a.data ?? ""));
}
