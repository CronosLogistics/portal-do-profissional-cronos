import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { PeriodoFerias } from "./saldo-ferias.rules";

export type MinhasFerias = {
  nome: string; departamento: string | null; gestor: string | null;
  periodos: PeriodoFerias[]; erro: string | null;
};

/** Saldos de férias do próprio profissional: o e-mail vem do cadastro verificado, nunca do navegador. */
export const minhasFerias = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MinhasFerias> => {
    const { data: perfil, error } = await context.supabase.from("profiles").select("email,full_name,is_active").eq("id", context.userId).maybeSingle();
    if (error || perfil?.is_active !== true) throw new Error("Profissional não disponível.");
    const nome = (perfil.full_name ?? "").replace(/\s*-\s*Cronos Logistics$/i, "").trim();
    const vazio: MinhasFerias = { nome, departamento: null, gestor: null, periodos: [], erro: null };
    if (!perfil.email) return vazio;
    const email = perfil.email;
    try {
      const [{ idsProfissionalDoEmail, cadastroDoEmail }, { itensSaldoFerias }, { periodosDoProfissional }] = await Promise.all([
        import("./perfil.server"), import("./saldo-ferias.server"), import("./saldo-ferias.rules"),
      ]);
      const [ids, itens, cadastro, gestor] = await Promise.all([
        idsProfissionalDoEmail(email),
        itensSaldoFerias(),
        cadastroDoEmail(email).catch(() => null),
        import("./gestor-perfil.server").then((m) => m.gestorDoUsuario(context.userId)).catch((e) => { console.error(e); return null; }),
      ]);
      return { nome, departamento: cadastro?.departamento ?? null, gestor, periodos: periodosDoProfissional(itens, ids), erro: null };
    } catch (e) {
      console.error("Saldo de férias:", e);
      return { ...vazio, erro: "Não foi possível consultar seus saldos de férias no SharePoint. Tente novamente." };
    }
  });
