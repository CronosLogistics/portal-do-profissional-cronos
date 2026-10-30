import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { PendenciaNC } from "@/lib/pendencias.rules";

/** Pendências de Análise de NC da pessoa logada. Por enquanto, só administradores. */
export const minhasPendencias = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ analiseNC: PendenciaNC[]; erro: string | null }> => {
    const { data: admin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (admin !== true) throw new Error("Acesso restrito a administradores.");
    const { data: perfil } = await context.supabase.from("profiles").select("email,is_active").eq("id", context.userId).maybeSingle();
    if (!perfil?.email || perfil.is_active === false) return { analiseNC: [], erro: null };
    try {
      const { dadosAnaliseNC, titulosNC } = await import("@/lib/pendencias.server");
      const { pendenciasDoUsuario } = await import("@/lib/pendencias.rules");
      const { itens, usuarios } = await dadosAnaliseNC();
      const sem = pendenciasDoUsuario(itens, perfil.email, usuarios, new Map(), new Date());
      const ids = itens.filter((i) => sem.some((p) => p.id === i.id)).map((i) => String(i.fields.NCLookupId ?? ""));
      const ncs = await titulosNC(ids);
      return { analiseNC: pendenciasDoUsuario(itens, perfil.email, usuarios, ncs, new Date()), erro: null };
    } catch (e) {
      console.error(e);
      return { analiseNC: [], erro: e instanceof Error ? e.message : "Falha ao carregar as pendências." };
    }
  });
