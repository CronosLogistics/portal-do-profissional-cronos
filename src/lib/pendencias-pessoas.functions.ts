import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { LISTAS_PESSOAS, pessoasDoUsuario, type TipoPendenciaPessoas, type PendenciaPessoas } from "./pendencias-pessoas.rules";
import { unirPendencias } from "./departamentos.rules";

export const minhasPendenciasPessoas = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: perfil, error } = await context.supabase.from("profiles").select("email,is_active").eq("id", context.userId).maybeSingle();
    if (error || !perfil?.email || perfil.is_active !== true) throw new Error("Profissional não disponível.");
    const { escopoDepartamento } = await import("./departamentos.server");
    const escopo = await escopoDepartamento(context.supabase, context.userId);
    const { dadosPendenciasPessoas } = await import("./pendencias-pessoas.server");
    const d = await dadosPendenciasPessoas();
    const listas = {} as Record<TipoPendenciaPessoas, PendenciaPessoas[]>;
    for (const tipo of Object.keys(LISTAS_PESSOAS) as TipoPendenciaPessoas[]) listas[tipo] = unirPendencias(escopo.emails, email => pessoasDoUsuario(tipo, d.listas[tipo], email, escopo.gestaoPessoas, d.usuarios, new Date()));
    return { listas, erros: d.erros };
  });