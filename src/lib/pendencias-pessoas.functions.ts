import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { LISTAS_PESSOAS, pessoasDoUsuario, type TipoPendenciaPessoas, type PendenciaPessoas } from "./pendencias-pessoas.rules";
import { normalizarEmail, unirPendencias } from "./departamentos.rules";

export const minhasPendenciasPessoas = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: perfil, error } = await context.supabase.from("profiles").select("email,is_active").eq("id", context.userId).maybeSingle();
    if (error || !perfil?.email || perfil.is_active !== true) throw new Error("Profissional não disponível.");
    const { escopoDepartamento } = await import("./departamentos.server");
    const escopo = await escopoDepartamento(context.supabase, context.userId);
    const proprio = normalizarEmail(perfil.email);
    const outros = escopo.emails.filter(e => e !== proprio);
    const { dadosPendenciasPessoas } = await import("./pendencias-pessoas.server");
    const d = await dadosPendenciasPessoas();
    const agora = new Date();
    const listas = {} as Record<TipoPendenciaPessoas, PendenciaPessoas[]>;
    const liderados = {} as Record<TipoPendenciaPessoas, PendenciaPessoas[]>;
    for (const tipo of Object.keys(LISTAS_PESSOAS) as TipoPendenciaPessoas[]) {
      listas[tipo] = pessoasDoUsuario(tipo, d.listas[tipo], proprio, escopo.gestaoPessoas, d.usuarios, agora);
      const meus = new Set(listas[tipo].map(p => p.id));
      // Liderados não herdam o acesso amplo de Gestão de Pessoas do gestor.
      liderados[tipo] = outros.length ? unirPendencias(outros, email => pessoasDoUsuario(tipo, d.listas[tipo], email, false, d.usuarios, agora)).filter(p => !meus.has(p.id)) : [];
    }
    const feedbacks = [...listas.feedback, ...liderados.feedback];
    if (feedbacks.length) {
      try {
        const { linksNCPorTitulo } = await import("./pendencias.server");
        const links = await linksNCPorTitulo(feedbacks.map(p => p.nc ?? ""));
        for (const p of feedbacks) { const l = p.nc ? links.get(p.nc) : undefined; if (l) p.linkNc = l; }
      } catch (e) { console.error("Links das NCs indisponíveis", e); }
    }
    return { listas, liderados, erros: d.erros };
  });
