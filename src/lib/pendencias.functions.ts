import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { PendenciaNC, PendenciaNPS } from "@/lib/pendencias.rules";

type Resultado = {
  analiseNC: PendenciaNC[];
  analiseNCMaior: PendenciaNC[];
  planoAcao: PendenciaNC[];
  analiseSM: PendenciaNC[];
  planoAcaoSM: PendenciaNC[];
  nps: PendenciaNPS[];
  erro: string | null;
};
const vazio = (erro: string | null): Resultado => ({ analiseNC: [], analiseNCMaior: [], planoAcao: [], analiseSM: [], planoAcaoSM: [], nps: [], erro });

/** Pendências da Qualidade da pessoa logada. Por enquanto, só administradores. */
export const minhasPendencias = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Resultado> => {
    const { data: admin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (admin !== true) throw new Error("Acesso restrito a administradores.");
    const { data: perfil } = await context.supabase.from("profiles").select("email,is_active").eq("id", context.userId).maybeSingle();
    if (!perfil?.email || perfil.is_active === false) return vazio(null);
    const email = perfil.email;
    try {
      const { dadosAnaliseNC, titulosNC } = await import("@/lib/pendencias.server");
      const { pendenciasDoUsuario, planosDoUsuario, npsDoUsuario, LINK_PLANO_ACAO, LINK_PLANO_ACAO_SM } = await import("@/lib/pendencias.rules");
      const d = await dadosAnaliseNC();
      const agora = new Date();
      const vaz = new Map<string, string>();
      const ncDe = (lista: typeof d.itens, ids: string[]) => lista.filter((i) => ids.includes(i.id)).map((i) => String(i.fields.NCLookupId ?? ""));
      const ids = (ps: PendenciaNC[]) => ps.map((p) => p.id);
      const [ncs, sms] = await Promise.all([
        titulosNC([
          ...ncDe(d.itens, ids(pendenciasDoUsuario(d.itens, email, d.usuarios, vaz, agora, "analise"))),
          ...ncDe(d.itensMaior, ids(pendenciasDoUsuario(d.itensMaior, email, d.usuarios, vaz, agora, "maior"))),
          ...ncDe(d.itensPlano, ids(planosDoUsuario(d.itensPlano, email, d.usuarios, vaz, agora))),
        ]),
        titulosNC([
          ...ncDe(d.itensSM, ids(pendenciasDoUsuario(d.itensSM, email, d.usuarios, vaz, agora, "sm"))),
          ...ncDe(d.itensPlanoSM, ids(planosDoUsuario(d.itensPlanoSM, email, d.usuarios, vaz, agora))),
        ], true),
      ]);
      return {
        analiseNC: pendenciasDoUsuario(d.itens, email, d.usuarios, ncs, agora, "analise"),
        analiseNCMaior: pendenciasDoUsuario(d.itensMaior, email, d.usuarios, ncs, agora, "maior"),
        planoAcao: planosDoUsuario(d.itensPlano, email, d.usuarios, ncs, agora, LINK_PLANO_ACAO),
        analiseSM: pendenciasDoUsuario(d.itensSM, email, d.usuarios, sms, agora, "sm"),
        planoAcaoSM: planosDoUsuario(d.itensPlanoSM, email, d.usuarios, sms, agora, LINK_PLANO_ACAO_SM),
        nps: npsDoUsuario(d.itensNPS, email, d.usuarios),
        erro: null,
      };
    } catch (e) {
      console.error(e);
      return vazio(e instanceof Error ? e.message : "Falha ao carregar as pendências.");
    }
  });
