import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { PendenciaNC } from "@/lib/pendencias.rules";

/** Pendências de Análise de NC da pessoa logada. Por enquanto, só administradores. */
export const minhasPendencias = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ analiseNC: PendenciaNC[]; analiseNCMaior: PendenciaNC[]; erro: string | null }> => {
    const { data: admin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (admin !== true) throw new Error("Acesso restrito a administradores.");
    const { data: perfil } = await context.supabase.from("profiles").select("email,is_active").eq("id", context.userId).maybeSingle();
    if (!perfil?.email || perfil.is_active === false) return { analiseNC: [], analiseNCMaior: [], erro: null };
    try {
      const { dadosAnaliseNC, titulosNC } = await import("@/lib/pendencias.server");
      const { pendenciasDoUsuario } = await import("@/lib/pendencias.rules");
      const { itens, itensMaior, usuarios } = await dadosAnaliseNC();
      const agora = new Date();
      const idsDe = (lista: typeof itens, tipo: "analise" | "maior") => {
        const sem = new Set(pendenciasDoUsuario(lista, perfil.email!, usuarios, new Map(), agora, tipo).map((p) => p.id));
        return lista.filter((i) => sem.has(i.id)).map((i) => String(i.fields.NCLookupId ?? ""));
      };
      const ncs = await titulosNC([...idsDe(itens, "analise"), ...idsDe(itensMaior, "maior")]);
      return {
        analiseNC: pendenciasDoUsuario(itens, perfil.email, usuarios, ncs, agora, "analise"),
        analiseNCMaior: pendenciasDoUsuario(itensMaior, perfil.email, usuarios, ncs, agora, "maior"),
        erro: null,
      };
    } catch (e) {
      console.error(e);
      return { analiseNC: [], analiseNCMaior: [], erro: e instanceof Error ? e.message : "Falha ao carregar as pendências." };
    }
  });
