import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { emailsFeedbacksLiderados, feedbacksDoProfissional, type FeedbackGestor } from "./feedback-gestor.rules";
import { unirPendencias } from "./departamentos.rules";

export const meusFeedbacksGestor = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ feedbacks: FeedbackGestor[]; liderados: FeedbackGestor[]; temLiderados: boolean; erro: string | null; erroLiderados: string | null }> => {
    const { data: perfil, error } = await context.supabase.from("profiles").select("email,is_active").eq("id", context.userId).maybeSingle();
    if (error || !perfil?.email || perfil.is_active !== true) throw new Error("Profissional não disponível.");
    try {
      const { dadosFeedbacksGestor } = await import("./pendencias-pessoas.server");
      const { consultarDepartamentos } = await import("./departamentos.server");
      const [d, hierarquia] = await Promise.all([
        dadosFeedbacksGestor(),
        consultarDepartamentos().then(snapshot => ({ snapshot, erro: null })).catch(error => {
          console.error("Hierarquia dos feedbacks:", error);
          return { snapshot: null, erro: "Não foi possível verificar seus liderados. Tente novamente." };
        }),
      ]);
      const feedbacks = feedbacksDoProfissional(d.itens, d.profissionais, d.usuarios, perfil.email);
      const emails = hierarquia.snapshot ? emailsFeedbacksLiderados(hierarquia.snapshot, perfil.email) : [];
      return { feedbacks, liderados: unirPendencias(emails, email => feedbacksDoProfissional(d.itens, d.profissionais, d.usuarios, email)), temLiderados: emails.length > 0, erro: null, erroLiderados: hierarquia.erro };
    } catch (error) {
      console.error("Feedback do gestor:", error);
      return { feedbacks: [], liderados: [], temLiderados: false, erro: "Não foi possível carregar seus feedbacks do SharePoint. Tente novamente.", erroLiderados: null };
    }
  });