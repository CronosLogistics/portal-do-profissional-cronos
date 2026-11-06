import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { montarDepartamentos, normalizarEmail, type SnapshotDepartamentos } from "./departamentos.rules";
import type { ItemAnaliseNC } from "./pendencias.rules";

const SITE = "cronoslogisticscombr.sharepoint.com,dc6d3de3-d3ee-4d0d-b0ba-b86afc2f715c,6caaae7c-2a4d-4322-82a8-354fe45cfde2";
async function ler<T>(lista: string, campos: string): Promise<T[]> {
  const key = process.env["LOVABLE_API_KEY"], graph = process.env["AZURE_GRAPH_API_KEY"];
  if (!key || !graph) throw new Error("Conexão Microsoft indisponível.");
  const gateway = "https://connector-gateway.lovable.dev/azure_graph";
  let url: string | null = `${gateway}/v1.0/sites/${SITE}/lists/${lista}/items?$select=id&$expand=fields($select=${campos})&$top=500`;
  const rows: T[] = [];
  for (let pagina = 0; url && pagina < 40; pagina++) {
    const res: Response = await fetch(url, { headers: { Authorization: `Bearer ${key}`, "X-Connection-Api-Key": graph }, signal: AbortSignal.timeout(20000) });
    if (!res.ok) { const body = await res.text(); console.error(`Departamentos Microsoft [${res.status}]: ${body}`); throw new Error(`Não foi possível consultar departamentos Microsoft [${res.status}].`); }
    const data = await res.json() as { value: T[]; "@odata.nextLink"?: string };
    rows.push(...data.value);
    if (data["@odata.nextLink"]) {
      const next = new URL(data["@odata.nextLink"]);
      if (next.hostname !== "graph.microsoft.com" || !next.pathname.startsWith(`/v1.0/sites/${SITE}/`)) throw new Error("Paginação de departamentos inesperada.");
      url = `${gateway}${next.pathname}${next.search}`;
    } else url = null;
  }
  if (url) throw new Error("Consulta de departamentos incompleta.");
  return rows;
}
export async function consultarDepartamentos(): Promise<SnapshotDepartamentos> {
  const [departamentos, profissionais, users] = await Promise.all([
    ler<ItemAnaliseNC>("d51e41a8-32ca-41b8-bd98-76b9027db451", "Title,L_x00ed_derDiretoLookupId,CoordenadorLookupId,SupervisorLookupId,Supervisor,Permiss_x00f5_esdosLiderados,Permiss_x00f5_esdoSupervisor,Permiss_x00e3_odoCoordenador,Permiss_x00f5_esdoL_x00ed_der"),
    ler<ItemAnaliseNC>("0e37d734-d94f-4832-9802-d3c2e7daf395", "field_1,DEPARTAMENTOATUALLookupId,SETORLookupId,E_x002d_MAILCORPORATIVOLookupId"),
    ler<{ id: string; fields: { EMail?: string; Title?: string } }>("dcbf95ce-8b48-451e-b14f-eab5d8fa098f", "EMail,Title"),
  ]);
  if (!departamentos.length || !profissionais.length || !users.length) throw new Error("Consulta de setores vazia; acessos existentes foram preservados.");
  return montarDepartamentos(departamentos, profissionais, new Map(users.map(u => [u.id, { email: u.fields.EMail ?? "", nome: u.fields.Title ?? "" }])));
}
/** Called only after authenticating a user or validating the existing scheduled job. No caller-supplied mappings. */
export async function sincronizarDepartamentos(force = false) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: status, error } = await supabaseAdmin.from("departamentos_sincronizacao").select("atualizado_em,erro").eq("id", true).maybeSingle();
  if (error) throw new Error("Não foi possível verificar a sincronização de setores.");
  if (!force && status?.atualizado_em && !status.erro && Date.now() - new Date(status.atualizado_em).getTime() < 300_000) return;
  const lock = await supabaseAdmin.rpc("reservar_departamentos");
  if (lock.error) throw new Error("Não foi possível iniciar a sincronização de setores.");
  if (!lock.data) {
    if (status?.atualizado_em) return;
    throw new Error("Setores em atualização. Tente novamente em instantes.");
  }
  try {
    const snapshot = await consultarDepartamentos();
    const result = await supabaseAdmin.rpc("aplicar_departamentos", { _snapshot: snapshot });
    if (result.error) { console.error(result.error); throw new Error("Não foi possível aplicar os perfis dos departamentos."); }
    return result.data;
  } catch (e) {
    await supabaseAdmin.from("departamentos_sincronizacao").update({ em_execucao_desde: null, erro: e instanceof Error ? e.message : "Falha ao sincronizar setores." }).eq("id", true);
    throw e;
  }
}
export type EscopoDepartamento = { departamento: string | null; gestaoPessoas: boolean; emails: string[] };
export async function escopoDepartamento(client: SupabaseClient<Database>, usuarioId: string): Promise<EscopoDepartamento> {
  const { data: perfil, error } = await client.from("profiles").select("email,is_active").eq("id", usuarioId).maybeSingle();
  if (error || perfil?.is_active !== true || !perfil.email) throw new Error("Profissional não disponível.");
  await sincronizarDepartamentos();
  const result = await client.rpc("meu_escopo_departamento");
  if (result.error || !result.data || typeof result.data !== "object" || Array.isArray(result.data)) throw new Error("Não foi possível verificar sua liderança.");
  const data = result.data;
  return { departamento: typeof data['departamento'] === "string" ? data['departamento'] : null, gestaoPessoas: data['gestaoPessoas'] === true, emails: Array.isArray(data['emails']) ? [...new Set(data['emails'].filter((e): e is string => typeof e === "string" && !!e).map(normalizarEmail))] : [normalizarEmail(perfil.email)] };
}