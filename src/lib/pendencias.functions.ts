import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { PendenciaNC, PendenciaNPS, PendenciaRevisao } from "@/lib/pendencias.rules";
import { normalizarEmail, unirPendencias } from "./departamentos.rules";

export type ListasQualidade = {
  analiseNC: PendenciaNC[];
  analiseNCMaior: PendenciaNC[];
  planoAcao: PendenciaNC[];
  analiseSM: PendenciaNC[];
  planoAcaoSM: PendenciaNC[];
  nps: PendenciaNPS[];
  revisoes: PendenciaRevisao[];
};
type Resultado = { proprias: ListasQualidade; liderados: ListasQualidade; temLiderados?: boolean; erro: string | null };
const listasVazias = (): ListasQualidade => ({ analiseNC: [], analiseNCMaior: [], planoAcao: [], analiseSM: [], planoAcaoSM: [], nps: [], revisoes: [] });
const vazio = (erro: string | null): Resultado => ({ proprias: listasVazias(), liderados: listasVazias(), erro });

/** Pendências da Qualidade: próprias do profissional logado e, separadamente, as dos liderados. */
export const minhasPendencias = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Resultado> => {
    const { data: perfil } = await context.supabase.from("profiles").select("email,is_active").eq("id", context.userId).maybeSingle();
    if (!perfil?.email || perfil.is_active !== true) return vazio(null);
    try {
      const { escopoDepartamento } = await import("./departamentos.server");
      const escopo = await escopoDepartamento(context.supabase, context.userId);
      const proprio = normalizarEmail(perfil.email);
      const outros = escopo.emails.filter((e) => e !== proprio);
      const { dadosAnaliseNC, titulosNC } = await import("@/lib/pendencias.server");
      const { pendenciasDoUsuario, planosDoUsuario, npsDoUsuario, revisoesDoUsuario, LINK_PLANO_ACAO, LINK_PLANO_ACAO_SM } = await import("@/lib/pendencias.rules");
      const d = await dadosAnaliseNC();
      const agora = new Date();
      const vaz = new Map<string, string>();
      const todos = [proprio, ...outros];
      const analises = (emails: string[], lista: typeof d.itens, ncs: Map<string, string>, tipo: "analise" | "maior" | "sm") => unirPendencias(emails, email => pendenciasDoUsuario(lista, email, d.usuarios, ncs, agora, tipo));
      const planos = (emails: string[], lista: typeof d.itens, ncs: Map<string, string>, link = LINK_PLANO_ACAO) => unirPendencias(emails, email => planosDoUsuario(lista, email, d.usuarios, ncs, agora, link));
      const ncDe = (lista: typeof d.itens, ids: string[]) => lista.filter((i) => ids.includes(i.id)).map((i) => String(i.fields.NCLookupId ?? ""));
      const ids = (ps: PendenciaNC[]) => ps.map((p) => p.id);
      const [ncs, sms] = await Promise.all([
        titulosNC([
          ...ncDe(d.itens, ids(analises(todos, d.itens, vaz, "analise"))),
          ...ncDe(d.itensMaior, ids(analises(todos, d.itensMaior, vaz, "maior"))),
          ...ncDe(d.itensPlano, ids(planos(todos, d.itensPlano, vaz))),
        ]),
        titulosNC([
          ...ncDe(d.itensSM, ids(analises(todos, d.itensSM, vaz, "sm"))),
          ...ncDe(d.itensPlanoSM, ids(planos(todos, d.itensPlanoSM, vaz))),
        ], true),
      ]);
      const montar = (emails: string[]): ListasQualidade => emails.length === 0 ? listasVazias() : {
        analiseNC: analises(emails, d.itens, ncs, "analise"),
        analiseNCMaior: analises(emails, d.itensMaior, ncs, "maior"),
        planoAcao: planos(emails, d.itensPlano, ncs),
        analiseSM: analises(emails, d.itensSM, sms, "sm"),
        planoAcaoSM: planos(emails, d.itensPlanoSM, sms, LINK_PLANO_ACAO_SM),
        nps: unirPendencias(emails, email => npsDoUsuario(d.itensNPS, email, d.usuarios)),
        revisoes: unirPendencias(emails, email => revisoesDoUsuario(d.itensRevisoes, email, d.usuarios, agora)),
      };
      const proprias = montar([proprio]);
      const equipe = montar(outros);
      // Itens que já são do próprio gestor não se repetem na aba dos liderados.
      const sem = <T extends { id: string }>(lista: T[], minhas: T[]) => { const s = new Set(minhas.map(p => p.id)); return lista.filter(p => !s.has(p.id)); };
      const liderados = Object.fromEntries((Object.keys(equipe) as (keyof ListasQualidade)[]).map(k => [k, sem(equipe[k] as { id: string }[], proprias[k] as { id: string }[])])) as ListasQualidade;
      return { proprias, liderados, temLiderados: outros.length > 0, erro: null };
    } catch (e) {
      console.error(e);
      return vazio(e instanceof Error ? e.message : "Falha ao carregar as pendências.");
    }
  });
