import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { FeriasColaborador } from "./ferias.rules";

export const listarFeriasColaboradores = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ itens: FeriasColaborador[]; erro: string | null }> => {
    const { data: perfil, error } = await context.supabase.from("profiles").select("is_active").eq("id", context.userId).maybeSingle();
    if (error || perfil?.is_active !== true) throw new Error("Profissional não disponível.");
    try {
      const { consultarFerias } = await import("./ferias.server");
      return { itens: await consultarFerias(), erro: null };
    } catch (error) {
      console.error("Férias dos colaboradores:", error);
      return { itens: [], erro: "Não foi possível consultar as férias no SharePoint. Tente novamente." };
    }
  });