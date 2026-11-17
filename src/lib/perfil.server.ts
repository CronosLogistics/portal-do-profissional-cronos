/** Dados cadastrais do perfil lidos da lista Profissionais Brasil (somente campos públicos ao próprio profissional). */
import { normalizarEmail } from "./departamentos.rules";

const SITE = "cronoslogisticscombr.sharepoint.com,dc6d3de3-d3ee-4d0d-b0ba-b86afc2f715c,6caaae7c-2a4d-4322-82a8-354fe45cfde2";
const PROFISSIONAIS = "0e37d734-d94f-4832-9802-d3c2e7daf395";
const USUARIOS = "dcbf95ce-8b48-451e-b14f-eab5d8fa098f";
const GATEWAY = "https://connector-gateway.lovable.dev/azure_graph";

type Campos = { field_1?: string; field_3?: string; field_4?: string; DATADENASC_x002e_?: string; Cargo0?: string; CARGO?: string; DEPARTAMENTOATUAL?: string; E_x002d_MAILCORPORATIVOLookupId?: number | string };
export type DadosCadastro = { cargo: string | null; departamento: string | null; escritorio: string | null; admissao: string | null; nascimento: string | null };

let cache: { em: number; rows: { id: string; fields: Campos }[]; usuarios: Map<string, string> } | null = null;

async function ler<T>(path: string): Promise<T[]> {
  const key = process.env["LOVABLE_API_KEY"], graph = process.env["AZURE_GRAPH_API_KEY"];
  if (!key || !graph) throw new Error("Conexão Microsoft indisponível.");
  let url: string | null = `${GATEWAY}/v1.0/sites/${SITE}/${path}`;
  const rows: T[] = [];
  for (let i = 0; url && i < 20; i++) {
    const res: Response = await fetch(url, { headers: { Authorization: `Bearer ${key}`, "X-Connection-Api-Key": graph }, signal: AbortSignal.timeout(20000) });
    if (!res.ok) throw new Error(`Não foi possível ler o cadastro Microsoft [${res.status}].`);
    const data = (await res.json()) as { value: T[]; "@odata.nextLink"?: string };
    rows.push(...data.value);
    if (data["@odata.nextLink"]) {
      const next = new URL(data["@odata.nextLink"]);
      if (next.hostname !== "graph.microsoft.com" || !next.pathname.startsWith(`/v1.0/sites/${SITE}/`)) throw new Error("Paginação inesperada.");
      url = `${GATEWAY}${next.pathname}${next.search}`;
    } else url = null;
  }
  return rows;
}

/** Datas do SharePoint chegam em UTC à meia-noite de Brasília. */
const dataCivil = (v?: string) => (v ? new Date(v).toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" }) : null);

export async function cadastroDoEmail(email: string): Promise<DadosCadastro | null> {
  if (!cache || Date.now() - cache.em > 15 * 60_000) {
    const [rows, users] = await Promise.all([
      ler<{ id: string; fields: Campos }>(`lists/${PROFISSIONAIS}/items?$select=id&$expand=fields($select=field_1,field_3,field_4,DATADENASC_x002e_,Cargo0,CARGO,DEPARTAMENTOATUAL,E_x002d_MAILCORPORATIVOLookupId)&$top=500`),
      ler<{ id: string; fields: { EMail?: string } }>(`lists/${USUARIOS}/items?$select=id&$expand=fields($select=EMail)&$top=500`),
    ]);
    cache = { em: Date.now(), rows, usuarios: new Map(users.map((u) => [u.id, normalizarEmail(u.fields.EMail ?? "")])) };
  }
  const alvo = normalizarEmail(email);
  const meus = cache.rows.filter((r) => ["ATIVO", "EFETIVADO/ATIVO"].includes(r.fields.field_1?.trim().toUpperCase() ?? "") && cache!.usuarios.get(String(r.fields.E_x002d_MAILCORPORATIVOLookupId)) === alvo);
  if (meus.length !== 1) return null;
  const f = meus[0]!.fields;
  return {
    cargo: f.Cargo0?.trim() || f.CARGO?.trim() || null,
    departamento: f.DEPARTAMENTOATUAL?.trim() || null,
    escritorio: f.field_3?.trim() || null,
    admissao: dataCivil(f.field_4),
    nascimento: dataCivil(f.DATADENASC_x002e_),
  };
}
