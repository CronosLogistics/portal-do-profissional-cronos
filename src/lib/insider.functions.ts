import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { conteudoInsiderSchema, mesSchema } from "./insider.rules";

export const prepararEdicaoInsider = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => z.object({ mes: mesSchema }).parse(v))
  .handler(async ({ data, context }) => {
    const perm = await context.supabase.rpc("tem_permissao", { _permissao: "avisos.insider" });
    if (perm.error || !perm.data) throw new Error("Você não tem permissão para preparar o Insider.");
    const { prepararInsider } = await import("./insider.server");
    return prepararInsider(data.mes, "manual");
  });
export const salvarEdicaoInsider = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => z.object({ id: z.string().uuid(), revisao: z.number().int().positive(), titulo: z.string().trim().min(1).max(120), conteudo: conteudoInsiderSchema }).parse(v))
  .handler(async ({ data, context }) => {
    const caminhos = [data.conteudo.bannerMes, ...data.conteudo.eventos.map(e => e.imagem), ...data.conteudo.aniversariantes.map(p => p.foto), ...data.conteudo.tempoCasa.map(p => p.foto)].filter(Boolean);
    if (caminhos.some(p => !p.startsWith(`${data.id}/`))) throw new Error("Imagem de outra edição não permitida.");
    const r = await context.supabase.rpc("salvar_edicao_insider", { _id: data.id, _revisao: data.revisao, _titulo: data.titulo, _conteudo: data.conteudo });
    if (r.error) throw new Error(r.error.message);
    return r.data;
  });