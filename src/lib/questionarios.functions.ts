import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { novoQuestionarioSchema, editarQuestionarioSchema, respostaQuestionarioSchema, idQuestionarioSchema, normalizarPerguntas, type Questionario, type GestaoQuestionario, type PerguntaQuestionario } from "./questionarios.rules";

function projetarQuestionario(raw: Questionario): Questionario {
  return { ...raw, perguntas: normalizarPerguntas(raw.perguntas) };
}

export const listarQuestionarios = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }): Promise<Questionario[]> => {
  const result = await context.supabase.rpc("listar_questionarios");
  if (result.error) throw new Error("Não foi possível consultar os formulários.");
  return (result.data as unknown as Questionario[]).map(projetarQuestionario);
});
export const contarQuestionariosPendentes = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }): Promise<number> => {
  const result = await context.supabase.rpc("contar_questionarios_pendentes");
  if (result.error) throw new Error("Não foi possível consultar as pesquisas pendentes.");
  return Number(result.data ?? 0);
});
export const criarQuestionario = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator(input => novoQuestionarioSchema.parse(input)).handler(async ({ data, context }) => {
  const result = await context.supabase.rpc("criar_questionario_com_prazo", { _titulo: data.titulo, _descricao: data.descricao, _anonimo: data.anonimo, _perguntas: data.perguntas, ...(data.expira_em ? { _expira_em: data.expira_em } : {}) });
  if (result.error || !result.data) throw new Error("Não foi possível criar o formulário. Confira sua permissão e os campos.");
  let registrado = true;
  try { const { registrarQuestionarioSharePoint } = await import("./questionarios.server"); await registrarQuestionarioSharePoint(result.data); } catch { registrado = false; }
  return { id: result.data, registrado };
});
export const responderQuestionario = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator(input => respostaQuestionarioSchema.parse(input)).handler(async ({ data, context }) => {
  const result = await context.supabase.rpc("responder_questionario", { _id: data.id, _respostas: data.respostas });
  if (result.error?.message.includes("Prazo de resposta encerrado")) throw new Error("O prazo de resposta desta pesquisa foi encerrado.");
  if (result.error || !result.data) throw new Error("Não foi possível enviar. Responda todas as perguntas e confira se já respondeu este formulário.");
  let registrado = true;
  try { const { registrarQuestionarioSharePoint } = await import("./questionarios.server"); await registrarQuestionarioSharePoint(data.id, result.data); } catch { registrado = false; }
  return { registrado };
});
export const consultarGestaoQuestionario = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).inputValidator(input => idQuestionarioSchema.parse(input)).handler(async ({ data, context }): Promise<GestaoQuestionario> => {
  const result = await context.supabase.rpc("gestao_questionario", { _id: data.id });
  if (result.error) throw new Error("Não foi possível consultar as respostas. Confira sua permissão.");
  const gestao = result.data as unknown as GestaoQuestionario;
  return {
    ...gestao,
    respostas: gestao.respostas.map(r => ({ ...r, perguntas: normalizarPerguntas(r.perguntas as unknown as PerguntaQuestionario[]) })),
  };
});
export const reenviarQuestionarioSharePoint = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator(input => idQuestionarioSchema.parse(input)).handler(async ({ data, context }) => {
  const acesso = await context.supabase.rpc("gestao_questionario", { _id: data.id });
  if (acesso.error) throw new Error("Sem permissão para gerenciar este formulário.");
  const { registrarQuestionarioSharePoint } = await import("./questionarios.server"); await registrarQuestionarioSharePoint(data.id);
  return { registrado: true };
});
export const editarQuestionario = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator(input => editarQuestionarioSchema.parse(input)).handler(async ({ data, context }) => {
  const campos = { _id: data.id, _titulo: data.titulo, _descricao: data.descricao, _perguntas: data.perguntas };
  const result = data.expira_em === undefined
    ? await context.supabase.rpc("editar_questionario", campos)
    : await context.supabase.rpc("editar_questionario_com_prazo", { ...campos, ...(data.expira_em ? { _expira_em: data.expira_em } : {}) });
  if (result.error) throw new Error("Não foi possível editar o formulário. Confira sua permissão e os campos.");
  let registrado = true;
  try { const { registrarQuestionarioSharePoint } = await import("./questionarios.server"); await registrarQuestionarioSharePoint(data.id); } catch { registrado = false; }
  return { registrado };
});
export const excluirQuestionario = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator(input => idQuestionarioSchema.parse(input)).handler(async ({ data, context }) => {
  const inicio = await context.supabase.rpc("iniciar_exclusao_questionario", { _id: data.id });
  if (inicio.error) throw new Error("Não foi possível iniciar a exclusão. Confira sua permissão ou tente novamente após a sincronização.");
  try {
    const { excluirQuestionarioSharePoint } = await import("./questionarios.server");
    await excluirQuestionarioSharePoint(data.id);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const fim = await supabaseAdmin.rpc("finalizar_exclusao_questionario", { _id: data.id });
    if (fim.error) throw new Error("Falha ao finalizar exclusão");
    return { excluido: true };
  } catch {
    throw new Error("Exclusão ainda não concluída. O formulário está bloqueado para novas respostas. Clique em Tentar excluir novamente.");
  }
});
