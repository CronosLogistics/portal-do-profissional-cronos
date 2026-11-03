import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { feedbacksDoProfissional, type FeedbackGestor } from "./feedback-gestor.rules";

export const meusFeedbacksGestor = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ feedbacks: FeedbackGestor[]; erro: string | null }> => {
    const { data: perfil, error } = await context.supabase.from("profiles").select("email,is_active").eq("id", context.userId).maybeSingle();
    if (error || !perfil?.email || perfil.is_active !== true) throw new Error("Profissional não disponível.");
    try {
      const { dadosFeedbacksGestor } = await import("./pendencias-pessoas.server");
      const d = await dadosFeedbacksGestor();
      return { feedbacks: feedbacksDoProfissional(d.itens, d.profissionais, d.usuarios, perfil.email), erro: null };
    } catch (error) {
      console.error("Feedback do gestor:", error);
      return { feedbacks: [], erro: "Não foi possível carregar seus feedbacks do SharePoint. Tente novamente." };
    }
  });