import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const minhasCompetencias = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<string[]> => {
    const { data, error } = await context.supabase.from("perfil_competencias")
      .select("competencias").eq("usuario_id", context.userId).maybeSingle();
    if (error) throw new Error("Não foi possível carregar suas competências.");
    return data?.competencias ?? [];
  });

export const salvarCompetencias = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { competencias: string[] }) => {
    if (!data || !Array.isArray(data.competencias) || data.competencias.some((c) => typeof c !== "string" || !c.trim())) {
      throw new Error("Competências inválidas.");
    }
    return { competencias: [...new Map(data.competencias.map((c) => [c.trim().toLowerCase(), c.trim()])).values()] };
  })
  .handler(async ({ context, data }): Promise<string[]> => {
    const { data: salvo, error } = await context.supabase.from("perfil_competencias")
      .upsert({ usuario_id: context.userId, competencias: data.competencias })
      .select("competencias").single();
    if (error) throw new Error("Não foi possível salvar suas competências. Tente novamente.");
    return salvo.competencias;
  });