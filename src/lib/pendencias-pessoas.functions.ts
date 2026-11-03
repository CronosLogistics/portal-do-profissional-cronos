import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { ehGestaoPessoas, LISTAS_PESSOAS, pessoasDoUsuario, type TipoPendenciaPessoas, type PendenciaPessoas } from "./pendencias-pessoas.rules";

export const minhasPendenciasPessoas = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: admin, error: erroAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (erroAdmin || admin !== true) throw new Error("Acesso restrito a administradores.");
    const { data: perfil, error } = await context.supabase.from("profiles").select("email,is_active").eq("id", context.userId).maybeSingle();
    if (error || !perfil?.email || perfil.is_active !== true) throw new Error("Profissional não disponível.");
    const { data: vinculos, error: erroPerfis } = await context.supabase.from("usuario_perfis").select("perfis(nome,ativo)").eq("usuario_id", context.userId);
    if (erroPerfis) throw new Error("Não foi possível verificar seu perfil de acesso.");
    const perfis = (vinculos ?? []).flatMap(v => v.perfis ? [v.perfis] : []);
    const gp = ehGestaoPessoas(perfis);
    const { dadosPendenciasPessoas } = await import("./pendencias-pessoas.server");
    const d = await dadosPendenciasPessoas();
    const listas = {} as Record<TipoPendenciaPessoas, PendenciaPessoas[]>;
    for (const tipo of Object.keys(LISTAS_PESSOAS) as TipoPendenciaPessoas[]) listas[tipo] = pessoasDoUsuario(tipo, d.listas[tipo], perfil.email, gp, d.usuarios, new Date());
    return { listas, erros: d.erros };
  });