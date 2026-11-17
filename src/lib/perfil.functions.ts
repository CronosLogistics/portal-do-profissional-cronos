import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ElogioPerfil = { id: string; data: string | null; texto: string; autor: string | null };
export type DadosPerfil = {
  cargo: string | null; departamento: string | null; escritorio: string | null;
  admissao: string | null; nascimento: string | null; gestor: string | null;
  elogiosTotal: number; elogios: ElogioPerfil[]; erro: string | null;
};

const ORDEM = ["lider", "coordenador", "supervisor"];
const semSufixo = (n: string) => n.replace(/\s*-\s*Cronos Logistics$/i, "").trim();

/** Perfil do próprio profissional: e-mail vem do cadastro verificado, nunca do navegador. */
export const meuPerfil = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DadosPerfil> => {
    const vazio: DadosPerfil = { cargo: null, departamento: null, escritorio: null, admissao: null, nascimento: null, gestor: null, elogiosTotal: 0, elogios: [], erro: null };
    const { data: perfil } = await context.supabase.from("profiles").select("email,is_active").eq("id", context.userId).maybeSingle();
    if (!perfil?.email || perfil.is_active === false) return vazio;
    const erros: string[] = [];
    const [cadastro, elogios, gestor] = await Promise.all([
      import("@/lib/perfil.server").then((m) => m.cadastroDoEmail(perfil.email)).catch((e) => { console.error(e); erros.push("cadastro"); return null; }),
      (async () => {
        const { dadosElogios } = await import("@/lib/feedback.server");
        const { elogiosVisiveis } = await import("@/lib/feedback.rules");
        const { itens, usuarios } = await dadosElogios();
        return elogiosVisiveis(itens, perfil.email, usuarios).filter((e) => e.vinculo === "meu").sort((a, b) => (b.data ?? "").localeCompare(a.data ?? ""));
      })().catch((e) => { console.error(e); erros.push("elogios"); return []; }),
      (async () => {
        // Leitura restrita ao próprio vínculo: quem lidera o profissional na hierarquia sincronizada do SharePoint.
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: rel } = await supabaseAdmin.from("departamento_liderados").select("departamento_id,lider_id").eq("liderado_id", context.userId);
        if (!rel?.length) return null;
        const ids = [...new Set(rel.map((r) => r.lider_id))];
        const [{ data: pessoas }, { data: vinc }] = await Promise.all([
          supabaseAdmin.from("profiles").select("id,full_name,is_active").in("id", ids),
          supabaseAdmin.from("usuario_perfis").select("usuario_id,perfis(departamento_sp_id,nivel_departamento)").in("usuario_id", ids),
        ]);
        const nivel = (lider: string, dep: string) => {
          const v = (vinc ?? []).find((x) => x.usuario_id === lider && (x.perfis as { departamento_sp_id: string | null } | null)?.departamento_sp_id === dep);
          return ORDEM.indexOf((v?.perfis as { nivel_departamento: string | null } | null)?.nivel_departamento ?? "");
        };
        // O gestor imediato é o nível mais próximo: supervisor > coordenador > líder direto.
        const melhor = rel.map((r) => ({ id: r.lider_id, n: nivel(r.lider_id, r.departamento_id) })).sort((a, b) => b.n - a.n)
          .find((r) => pessoas?.some((p) => p.id === r.id && p.is_active));
        const nome = pessoas?.find((p) => p.id === melhor?.id)?.full_name;
        return nome ? semSufixo(nome) : null;
      })().catch((e) => { console.error(e); return null; }),
    ]);
    return {
      ...vazio, ...(cadastro ?? {}), gestor,
      elogiosTotal: elogios.length,
      elogios: elogios.slice(0, 3).map((e) => ({ id: e.id, data: e.data, texto: e.detalhamento, autor: e.elogiador })),
      erro: erros.length ? "Alguns dados do SharePoint não puderam ser carregados agora." : null,
    };
  });
