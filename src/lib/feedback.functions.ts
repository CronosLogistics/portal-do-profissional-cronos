import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Elogio } from "@/lib/feedback.rules";

/** Elogios da pessoa logada (e da equipe, quando ela é a gestora indicada). E-mail vem do cadastro, não do navegador. */
export const meusElogios = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ elogios: Elogio[]; erro: string | null }> => {
    const { data: perfil } = await context.supabase
      .from("profiles")
      .select("email,is_active")
      .eq("id", context.userId)
      .maybeSingle();
    if (!perfil?.email || perfil.is_active === false) return { elogios: [], erro: null };
    try {
      const { dadosElogios } = await import("@/lib/feedback.server");
      const { elogiosVisiveis } = await import("@/lib/feedback.rules");
      const { itens, usuarios } = await dadosElogios();
      return { elogios: elogiosVisiveis(itens, perfil.email, usuarios), erro: null };
    } catch (e) {
      console.error(e);
      return { elogios: [], erro: e instanceof Error ? e.message : "Falha ao carregar os elogios." };
    }
  });
