import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type PrivacidadePerfil = {
  mostrarBadges: boolean;
  mostrarAniversario: boolean;
  mostrarElogios: boolean;
};

export const PRIVACIDADE_PADRAO: PrivacidadePerfil = {
  mostrarBadges: true,
  mostrarAniversario: true,
  mostrarElogios: false,
};

type LinhaPrivacidade = {
  mostrar_badges: boolean;
  mostrar_aniversario: boolean;
  mostrar_elogios: boolean;
};

export function privacidadeDaLinha(linha: LinhaPrivacidade | null | undefined): PrivacidadePerfil {
  if (!linha) return { ...PRIVACIDADE_PADRAO };
  return {
    mostrarBadges: linha.mostrar_badges,
    mostrarAniversario: linha.mostrar_aniversario,
    mostrarElogios: linha.mostrar_elogios,
  };
}

export const salvarPrivacidade = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: PrivacidadePerfil) => {
    if (
      !data ||
      typeof data.mostrarBadges !== "boolean" ||
      typeof data.mostrarAniversario !== "boolean" ||
      typeof data.mostrarElogios !== "boolean"
    ) {
      throw new Error("Preferências de privacidade inválidas.");
    }
    return data;
  })
  .handler(async ({ context, data }): Promise<PrivacidadePerfil> => {
    const { data: salvo, error } = await context.supabase
      .from("perfil_privacidade")
      .upsert({
        usuario_id: context.userId,
        mostrar_badges: data.mostrarBadges,
        mostrar_aniversario: data.mostrarAniversario,
        mostrar_elogios: data.mostrarElogios,
      })
      .select("mostrar_badges,mostrar_aniversario,mostrar_elogios")
      .single();
    if (error) throw new Error("Não foi possível salvar suas preferências de privacidade. Tente novamente.");
    return privacidadeDaLinha(salvo);
  });
