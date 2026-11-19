import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const MAX_SOBRE = 1000;

export const salvarSobre = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { texto: string }) => {
    if (!data || typeof data.texto !== "string") throw new Error("Texto inválido.");
    const texto = data.texto.trim();
    if (texto.length > MAX_SOBRE) throw new Error(`O texto pode ter no máximo ${MAX_SOBRE} caracteres.`);
    return { texto };
  })
  .handler(async ({ context, data }): Promise<string> => {
    const { data: salvo, error } = await context.supabase.from("perfil_sobre")
      .upsert({ usuario_id: context.userId, texto: data.texto })
      .select("texto").single();
    if (error) throw new Error("Não foi possível salvar o Sobre mim. Tente novamente.");
    return salvo.texto;
  });
