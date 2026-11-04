import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { PendenciaNC, PendenciaNPS, PendenciaRevisao } from "@/lib/pendencias.rules";
import { unirPendencias } from "./departamentos.rules";

type Resultado = {
  analiseNC: PendenciaNC[];
  analiseNCMaior: PendenciaNC[];
  planoAcao: PendenciaNC[];
  analiseSM: PendenciaNC[];
  planoAcaoSM: PendenciaNC[];
  nps: PendenciaNPS[];
  revisoes: PendenciaRevisao[];
  erro: string | null;
};
const vazio = (erro: string | null): Resultado => ({ analiseNC: [], analiseNCMaior: [], planoAcao: [], analiseSM: [], planoAcaoSM: [], nps: [], revisoes: [], erro });

/** Pendências da Qualidade do profissional ativo logado. */
export const minhasPendencias = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Resultado> => {
    const { data: perfil } = await context.supabase.from("profiles").select("email,is_active").eq("id", context.userId).maybeSingle();
    if (!perfil?.email || perfil.is_active !== true) return vazio(null);
    try {
      const { escopoDepartamento } = await import("./departamentos.server");
      const escopo = await escopoDepartamento(context.supabase, context.userId);
      const { dadosAnaliseNC, titulosNC } = await import("@/lib/pendencias.server");
      const { pendenciasDoUsuario, planosDoUsuario, npsDoUsuario, revisoesDoUsuario, LINK_PLANO_ACAO, LINK_PLANO_ACAO_SM } = await import("@/lib/pendencias.rules");
      const d = await dadosAnaliseNC();
      const agora = new Date();
      const vaz = new Map<string, string>();
      const analises = (lista: typeof d.itens, ncs: Map<string, string>, tipo: "analise" | "maior" | "sm") => unirPendencias(escopo.emails, email => pendenciasDoUsuario(lista, email, d.usuarios, ncs, agora, tipo));
      const planos = (lista: typeof d.itens, ncs: Map<string, string>, link = LINK_PLANO_ACAO) => unirPendencias(escopo.emails, email => planosDoUsuario(lista, email, d.usuarios, ncs, agora, link));
      const ncDe = (lista: typeof d.itens, ids: string[]) => lista.filter((i) => ids.includes(i.id)).map((i) => String(i.fields.NCLookupId ?? ""));
      const ids = (ps: PendenciaNC[]) => ps.map((p) => p.id);
      const [ncs, sms] = await Promise.all([
        titulosNC([
          ...ncDe(d.itens, ids(analises(d.itens, vaz, "analise"))),
          ...ncDe(d.itensMaior, ids(analises(d.itensMaior, vaz, "maior"))),
          ...ncDe(d.itensPlano, ids(planos(d.itensPlano, vaz))),
        ]),
        titulosNC([
          ...ncDe(d.itensSM, ids(analises(d.itensSM, vaz, "sm"))),
          ...ncDe(d.itensPlanoSM, ids(planos(d.itensPlanoSM, vaz))),
        ], true),
      ]);
      return {
        analiseNC: analises(d.itens, ncs, "analise"),
        analiseNCMaior: analises(d.itensMaior, ncs, "maior"),
        planoAcao: planos(d.itensPlano, ncs),
        analiseSM: analises(d.itensSM, sms, "sm"),
        planoAcaoSM: planos(d.itensPlanoSM, sms, LINK_PLANO_ACAO_SM),
        nps: unirPendencias(escopo.emails, email => npsDoUsuario(d.itensNPS, email, d.usuarios)),
        revisoes: unirPendencias(escopo.emails, email => revisoesDoUsuario(d.itensRevisoes, email, d.usuarios, agora)),
        erro: null,
      };
    } catch (e) {
      console.error(e);
      return vazio(e instanceof Error ? e.message : "Falha ao carregar as pendências.");
    }
  });
