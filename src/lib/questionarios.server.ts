import { camposRegistro, normalizarPerguntas, type RespostaItem } from "./questionarios.rules";

const SITE = "cronoslogisticscombr.sharepoint.com,dc6d3de3-d3ee-4d0d-b0ba-b86afc2f715c,6caaae7c-2a4d-4322-82a8-354fe45cfde2";
const LISTA = "235c52ca-69c5-43e8-a5e8-0f7d4e36275a";
async function graph(path: string, init: RequestInit = {}) {
  const key = process.env["LOVABLE_API_KEY"], connection = process.env["MICROSOFT_SHAREPOINT_API_KEY"];
  if (!key || !connection) throw new Error("Conexão Microsoft indisponível.");
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${key}`); headers.set("X-Connection-Api-Key", connection);
  const result = await fetch(`https://connector-gateway.lovable.dev/microsoft_sharepoint/sites/${SITE}/lists/${LISTA}${path}`, { ...init, headers, signal: AbortSignal.timeout(20000) });
  if (!result.ok) { const body = await result.text(); console.error(`Registro de formulários Microsoft [${result.status}]: ${body}`); throw new Error(`Não foi possível registrar no SharePoint [${result.status}].`); }
  if (result.status === 204) return {};
  return result.json() as Promise<{ value?: { id: string; fields?: { Title?: string } }[]; "@odata.nextLink"?: string }>;
}
async function registrar(chave: string, fields: Record<string, string>, comData = false) {
  const found = await graph(`/items?$filter=${encodeURIComponent(`fields/Title eq '${chave}'`)}&$select=id&$top=1`, { headers: { Prefer: "HonorNonIndexedQueriesWarningMayFailRandomly" } });
  const existing = found.value?.[0];
  if (existing) { await graph(`/items/${existing.id}/fields`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(fields) }); return; }
  await graph("/items", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fields: { ...fields, Title: chave, ...(comData ? { DatadaResposta: dataRespostaSharePoint() } : {}) } }) });
}
/** Data (somente dia, horário de Brasília) em que a resposta chega ao SharePoint; o portal não guarda horário para preservar o anonimato. */
export function dataRespostaSharePoint(agora = new Date()): string {
  return `${agora.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" })}T12:00:00Z`;
}
/** Caller must authenticate and authorize the exact questionnaire before invoking this helper. */
export async function registrarQuestionarioSharePoint(id: string, respostaId?: string) {
  const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
  const lease = await db.rpc("reservar_registro_questionario", { _id: id });
  if (lease.error || !lease.data) throw new Error("Formulário em exclusão ou sincronização. Tente novamente.");
  try {
  const { data: q, error } = await db.from("questionarios_internos").select("id,titulo,anonimo,perguntas,criador_id,sharepoint_registrado,revisao").eq("id", id).single();
  if (error || !q) throw new Error("Questionário não encontrado.");
  const perguntas = normalizarPerguntas(q.perguntas);
  const criador = await db.from("profiles").select("full_name").eq("id", q.criador_id).single();
  if (!q.sharepoint_registrado) {
    await registrar(`Q:${id}`, camposRegistro(q, perguntas, [], criador.data?.full_name ?? "", ""));
    const updated = await db.from("questionarios_internos").update({ sharepoint_registrado: true }).eq("id", id).eq("revisao", q.revisao);
    if (updated.error) throw new Error("Não foi possível confirmar o registro.");
  }
  let query = db.from("questionarios_respostas").select("id,perguntas,respostas,respondente_id").eq("questionario_id", id);
  if (respostaId) query = query.eq("id", respostaId);
  const { data: respostas, error: falha } = await query;
  if (falha) throw new Error("Não foi possível consultar os registros pendentes.");
  for (const resposta of respostas ?? []) {
    let nome = "";
    if (!q.anonimo && resposta.respondente_id) { const profile = await db.from("profiles").select("full_name,email").eq("id", resposta.respondente_id).single(); nome = `${profile.data?.full_name ?? ""} (${profile.data?.email ?? ""})`; }
    await registrar(`R:${id}:${resposta.id}`, camposRegistro(q, normalizarPerguntas(resposta.perguntas ?? perguntas), resposta.respostas as RespostaItem[], criador.data?.full_name ?? "", nome), true);
    const updated = await db.from("questionarios_respostas").update({ sharepoint_registrado: true }).eq("id", resposta.id);
    if (updated.error) throw new Error("Não foi possível confirmar o registro da resposta.");
  }
  // Consolidate legacy per-question rows only after complete replacement rows are saved.
  const prefixes = [`Q:${id}:`, ...(respostas ?? []).map(r => `R:${id}:${r.id}:`)];
  let path: string | undefined = "/items?$expand=fields($select=Title)&$select=id,fields&$top=200";
  const legacy: string[] = [];
  while (path) {
    const page = await graph(path);
    for (const item of page.value ?? []) if (prefixes.some(prefix => item.fields?.Title?.startsWith(prefix))) legacy.push(item.id);
    const next = page["@odata.nextLink"];
    if (next) {
      const url = new URL(next);
      const base = `/v1.0/sites/${SITE}/lists/${LISTA}`;
      if (url.hostname !== "graph.microsoft.com" || !url.pathname.startsWith(`${base}/items`)) throw new Error("Paginação Microsoft inválida.");
      path = url.pathname.slice(base.length) + url.search;
    } else path = undefined;
  }
  for (const legacyId of legacy) await graph(`/items/${legacyId}`, { method: "DELETE" });
  } finally { await db.rpc("liberar_registro_questionario", { _id: id }); }
}

/** Only call after the permission-checked iniciar_exclusao_questionario RPC. */
export async function excluirQuestionarioSharePoint(id: string) {
  let path: string | undefined = "/items?$expand=fields($select=Title)&$select=id,fields&$top=200";
  const ids: string[] = [];
  while (path) {
    const page = await graph(path);
    for (const item of page.value ?? []) {
      const key = item.fields?.Title ?? "";
      if (key === `Q:${id}` || key.startsWith(`Q:${id}:`) || key.startsWith(`R:${id}:`)) ids.push(item.id);
    }
    const next = page["@odata.nextLink"];
    if (next) {
      const url = new URL(next), base = `/v1.0/sites/${SITE}/lists/${LISTA}`;
      if (url.hostname !== "graph.microsoft.com" || !url.pathname.startsWith(`${base}/items`)) throw new Error("Paginação Microsoft inválida.");
      path = url.pathname.slice(base.length) + url.search;
    } else path = undefined;
  }
  for (const itemId of ids) await graph(`/items/${itemId}`, { method: "DELETE" });
}