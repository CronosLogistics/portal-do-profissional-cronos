import { camposRegistro } from "./questionarios.rules";

const SITE = "cronoslogisticscombr.sharepoint.com,dc6d3de3-d3ee-4d0d-b0ba-b86afc2f715c,6caaae7c-2a4d-4322-82a8-354fe45cfde2";
const LISTA = "235c52ca-69c5-43e8-a5e8-0f7d4e36275a";
async function graph(path: string, init: RequestInit = {}) {
  const key = process.env["LOVABLE_API_KEY"], connection = process.env["MICROSOFT_SHAREPOINT_API_KEY"];
  if (!key || !connection) throw new Error("Conexão Microsoft indisponível.");
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${key}`); headers.set("X-Connection-Api-Key", connection);
  const result = await fetch(`https://connector-gateway.lovable.dev/microsoft_sharepoint/sites/${SITE}/lists/${LISTA}${path}`, { ...init, headers, signal: AbortSignal.timeout(20000) });
  if (!result.ok) { const body = await result.text(); console.error(`Registro de formulários Microsoft [${result.status}]: ${body}`); throw new Error(`Não foi possível registrar no SharePoint [${result.status}].`); }
  return result.json() as Promise<{ value?: { id: string }[] }>;
}
async function registrar(chave: string, fields: Record<string, string>) {
  const found = await graph(`/items?$filter=${encodeURIComponent(`fields/Title eq '${chave}'`)}&$select=id&$top=1`, { headers: { Prefer: "HonorNonIndexedQueriesWarningMayFailRandomly" } });
  if (found.value?.length) return;
  await graph("/items", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fields: { ...fields, Title: chave } }) });
}
/** Caller must authenticate and authorize the exact questionnaire before invoking this helper. */
export async function registrarQuestionarioSharePoint(id: string, respostaId?: string) {
  const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
  const { data: q, error } = await db.from("questionarios_internos").select("id,titulo,anonimo,perguntas,criador_id,sharepoint_registrado").eq("id", id).single();
  if (error || !q) throw new Error("Questionário não encontrado.");
  const perguntas = q.perguntas as string[];
  const criador = await db.from("profiles").select("full_name").eq("id", q.criador_id).single();
  if (!q.sharepoint_registrado) {
    for (const [i, pergunta] of perguntas.entries()) await registrar(`Q:${id}:${i + 1}`, camposRegistro(q, pergunta, "", criador.data?.full_name ?? "", ""));
    const updated = await db.from("questionarios_internos").update({ sharepoint_registrado: true }).eq("id", id);
    if (updated.error) throw new Error("Não foi possível confirmar o registro.");
  }
  let query = db.from("questionarios_respostas").select("id,respostas,respondente_id").eq("questionario_id", id).eq("sharepoint_registrado", false).limit(100);
  if (respostaId) query = query.eq("id", respostaId);
  const { data: respostas, error: falha } = await query;
  if (falha) throw new Error("Não foi possível consultar os registros pendentes.");
  for (const resposta of respostas ?? []) {
    let nome = "";
    if (!q.anonimo && resposta.respondente_id) { const profile = await db.from("profiles").select("full_name,email").eq("id", resposta.respondente_id).single(); nome = `${profile.data?.full_name ?? ""} (${profile.data?.email ?? ""})`; }
    const textos = resposta.respostas as string[];
    for (const [i, pergunta] of perguntas.entries()) await registrar(`R:${id}:${resposta.id}:${i + 1}`, { ...camposRegistro(q, pergunta, textos[i] ?? "", criador.data?.full_name ?? "", nome), ...(q.anonimo ? {} : { DatadaResposta: new Date().toISOString() }) });
    const updated = await db.from("questionarios_respostas").update({ sharepoint_registrado: true }).eq("id", resposta.id);
    if (updated.error) throw new Error("Não foi possível confirmar o registro da resposta.");
  }
}