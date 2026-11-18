import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { selecionarGestorPerfil } from "./perfil-gestor.rules";

export type ElogioPerfil = { id: string; data: string | null; texto: string; autor: string | null };
export type DadosPerfil = {
  cargo: string | null; departamento: string | null; escritorio: string | null;
  admissao: string | null; nascimento: string | null; gestor: string | null;
  elogiosTotal: number; elogios: ElogioPerfil[];
  treinamentos: import("./treinamentos-perfil.server").TreinamentoPerfil[]; erro: string | null;
};

const semSufixo = (n: string) => n.replace(/\s*-\s*Cronos Logistics$/i, "").trim();

/** Perfil do próprio profissional: e-mail vem do cadastro verificado, nunca do navegador. */
export const meuPerfil = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DadosPerfil> => {
    const { data: perfil } = await context.supabase.from("profiles").select("email,is_active").eq("id", context.userId).maybeSingle();
    return montarPerfil(context.userId, perfil);
  });

export type PerfilColega = DadosPerfil & { nome: string; email: string | null; encontrado: boolean };

/** Perfil somente leitura de outro profissional ativo; exige sessão ativa e devolve apenas dados oficiais. */
export const perfilColega = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string }) => {
    if (!d || typeof d.userId !== "string" || !/^[0-9a-f-]{36}$/i.test(d.userId)) throw new Error("Perfil inválido");
    return d;
  })
  .handler(async ({ context, data }): Promise<PerfilColega> => {
    const { data: eu } = await context.supabase.from("profiles").select("is_active").eq("id", context.userId).maybeSingle();
    if (!eu || eu.is_active === false) throw new Error("Unauthorized");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: perfil } = await supabaseAdmin.from("profiles").select("email,is_active,full_name").eq("id", data.userId).maybeSingle();
    if (!perfil || perfil.is_active === false) return { ...VAZIO, nome: "", email: null, encontrado: false };
    return { ...(await montarPerfil(data.userId, perfil)), nome: semSufixo(perfil.full_name ?? ""), email: perfil.email, encontrado: true };
  });

const VAZIO: DadosPerfil = { cargo: null, departamento: null, escritorio: null, admissao: null, nascimento: null, gestor: null, elogiosTotal: 0, elogios: [], treinamentos: [], erro: null };

async function montarPerfil(userId: string, perfil: { email: string | null; is_active: boolean | null } | null): Promise<DadosPerfil> {
    const vazio = VAZIO;
    if (!perfil?.email || perfil.is_active === false) return vazio;
    const email = perfil.email;
    const erros: string[] = [];
    const [cadastro, elogios, gestor, treinamentos] = await Promise.all([
      import("@/lib/perfil.server").then((m) => m.cadastroDoEmail(email)).catch((e) => { console.error(e); erros.push("cadastro"); return null; }),
      (async () => {
        const { dadosElogios } = await import("@/lib/feedback.server");
        const { elogiosVisiveis } = await import("@/lib/feedback.rules");
        const { itens, usuarios } = await dadosElogios();
        return elogiosVisiveis(itens, email, usuarios).filter((e) => e.vinculo === "meu").sort((a, b) => (b.data ?? "").localeCompare(a.data ?? ""));
      })().catch((e) => { console.error(e); erros.push("elogios"); return []; }),
      (async () => {
        // Leitura restrita ao próprio vínculo: quem lidera o profissional na hierarquia sincronizada do SharePoint.
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: rel } = await supabaseAdmin.from("departamento_liderados").select("departamento_id,lider_id").eq("liderado_id", userId);
        if (!rel?.length) return null;
        const ids = [...new Set(rel.map((r) => r.lider_id))];
        const [{ data: pessoas }, { data: vinc }] = await Promise.all([
          supabaseAdmin.from("profiles").select("id,full_name,is_active").in("id", ids),
          supabaseAdmin.from("usuario_perfis").select("usuario_id,perfis(departamento_sp_id,nivel_departamento)").in("usuario_id", [...ids, userId]),
        ]);
        return selecionarGestorPerfil(userId, rel, vinc ?? [], pessoas ?? []);
      })().catch((e) => { console.error(e); return null; }),
      import("@/lib/treinamentos-perfil.server").then((m) => m.treinamentosDoEmail(email)).catch((e) => { console.error(e); erros.push("treinamentos"); return []; }),
    ]);
    return {
      ...vazio, ...(cadastro ?? {}), gestor, treinamentos,
      elogiosTotal: elogios.length,
      elogios: elogios.slice(0, 3).map((e) => ({ id: e.id, data: e.data, texto: e.detalhamento, autor: e.elogiador })),
      erro: erros.length ? "Alguns dados do SharePoint não puderam ser carregados agora." : null,
    };
  }
