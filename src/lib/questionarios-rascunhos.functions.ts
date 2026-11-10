import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { importacaoFormsSchema, normalizarImportacao, rascunhoSchema, type RascunhoQuestionario } from "./questionarios-importacao.rules";

export const listarRascunhosQuestionario = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }): Promise<RascunhoQuestionario[]> => {
  const r = await context.supabase.from("questionarios_rascunhos").select("id, titulo, descricao, anonimo, perguntas, atualizado_em").order("atualizado_em", { ascending: false });
  if (r.error) throw new Error("Não foi possível consultar os rascunhos.");
  return (r.data ?? []) as unknown as RascunhoQuestionario[];
});

export const salvarRascunhoQuestionario = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator(input => rascunhoSchema.parse(input)).handler(async ({ data, context }) => {
  const campos = { titulo: data.titulo, descricao: data.descricao, anonimo: data.anonimo, perguntas: data.perguntas as never };
  const r = data.id
    ? await context.supabase.from("questionarios_rascunhos").update(campos).eq("id", data.id).select("id").single()
    : await context.supabase.from("questionarios_rascunhos").insert(campos).select("id").single();
  if (r.error || !r.data) throw new Error("Não foi possível salvar o rascunho. Confira sua permissão.");
  return { id: r.data.id };
});

export const excluirRascunhoQuestionario = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator(input => z.object({ id: z.string().uuid() }).parse(input)).handler(async ({ data, context }) => {
  const r = await context.supabase.from("questionarios_rascunhos").delete().eq("id", data.id);
  if (r.error) throw new Error("Não foi possível excluir o rascunho.");
  return { ok: true };
});

/** Reads a Microsoft Forms printout (PDF) or pasted text with AI and returns editable questions. */
export const importarQuestionarioForms = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator(input => importacaoFormsSchema.parse(input)).handler(async ({ data, context }) => {
  const perm = await context.supabase.rpc("tem_permissao", { _permissao: "formularios.gerenciar" });
  if (perm.error || !perm.data) throw new Error("Sem permissão para gerenciar formulários.");
  const { extrairQuestionarioForms } = await import("./questionarios-importacao.server");
  const bruto = await extrairQuestionarioForms(data);
  return normalizarImportacao(bruto);
});
