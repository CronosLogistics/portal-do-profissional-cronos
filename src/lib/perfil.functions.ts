import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { PRIVACIDADE_PADRAO, privacidadeDaLinha, type PrivacidadePerfil } from "./privacidade.functions";
import { elegivelRanking } from "./ranking.rules";

export type ElogioPerfil = { id: string; data: string | null; texto: string; autor: string | null };
export type DadosPerfil = {
  cargo: string | null; departamento: string | null; escritorio: string | null;
  admissao: string | null; nascimento: string | null; gestor: string | null;
  sobre: string;
  privacidade: PrivacidadePerfil;
  /** Pontos do semestre mais recente; null para coordenadores/supervisores ou sem registro. */
  pontos: number | null;
  elogiosTotal: number; elogios: ElogioPerfil[];
  treinamentos: import("./treinamentos-perfil.server").TreinamentoPerfil[]; erro: string | null;
};

const semSufixo = (n: string) => n.replace(/\s*-\s*Cronos Logistics$/i, "").trim();

/** Perfil do próprio profissional: e-mail vem do cadastro verificado, nunca do navegador. */
export const meuPerfil = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DadosPerfil> => {
    const { data: perfil } = await context.supabase.from("profiles").select("email,is_active").eq("id", context.userId).maybeSingle();
    return montarPerfil(context.userId, perfil, context.userId);
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
    return { ...(await montarPerfil(data.userId, perfil, context.userId)), nome: semSufixo(perfil.full_name ?? ""), email: perfil.email, encontrado: true };
  });

const VAZIO: DadosPerfil = { cargo: null, departamento: null, escritorio: null, admissao: null, nascimento: null, gestor: null, sobre: "", privacidade: { ...PRIVACIDADE_PADRAO }, pontos: null, elogiosTotal: 0, elogios: [], treinamentos: [], erro: null };

async function montarPerfil(userId: string, perfil: { email: string | null; is_active: boolean | null } | null, viewerId: string): Promise<DadosPerfil> {
    const vazio = VAZIO;
    if (!perfil?.email || perfil.is_active === false) return vazio;
    const email = perfil.email;
    const proprio = viewerId === userId;
    const erros: string[] = [];
    const [cadastro, elogios, gestor, treinamentos, sobre, privacidade, pontuacao] = await Promise.all([
      import("@/lib/perfil.server").then((m) => m.cadastroDoEmail(email)).catch((e) => { console.error(e); erros.push("cadastro"); return null; }),
      (async () => {
        const { dadosElogios } = await import("@/lib/feedback.server");
        const { elogiosVisiveis } = await import("@/lib/feedback.rules");
        const { itens, usuarios } = await dadosElogios();
        return elogiosVisiveis(itens, email, usuarios).filter((e) => e.vinculo === "meu").sort((a, b) => (b.data ?? "").localeCompare(a.data ?? ""));
      })().catch((e) => { console.error(e); erros.push("elogios"); return []; }),
      // Leitura restrita ao próprio vínculo: quem lidera o profissional na hierarquia sincronizada do SharePoint.
      import("./gestor-perfil.server").then((m) => m.gestorDoUsuario(userId)).catch((e) => { console.error(e); return null; }),
      import("@/lib/treinamentos-perfil.server").then((m) => m.treinamentosDoEmail(email)).catch((e) => { console.error(e); erros.push("treinamentos"); return []; }),
      // Texto pessoal: leitura server-side para o próprio perfil e para colegas ativos.
      (async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data } = await supabaseAdmin.from("perfil_sobre").select("texto").eq("usuario_id", userId).maybeSingle();
        return data?.texto ?? "";
      })().catch((e) => { console.error(e); return ""; }),
      // Preferências de privacidade: dono edita; colegas só recebem o recorte já aplicado.
      (async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data } = await supabaseAdmin.from("perfil_privacidade").select("mostrar_badges,mostrar_aniversario,mostrar_elogios").eq("usuario_id", userId).maybeSingle();
        return privacidadeDaLinha(data);
      })().catch((e) => { console.error(e); return { ...PRIVACIDADE_PADRAO }; }),
      (async () => {
        const { pontuacoesSemestre } = await import("./ranking-treinamentos.server");
        const { consultarDepartamentos } = await import("./departamentos.server");
        const [todas, deps] = await Promise.all([pontuacoesSemestre(), consultarDepartamentos()]);
        const chave = (l: { ano: string; semestre: string }) => `${l.ano.padStart(4, "0")}-${l.semestre}`;
        const atual = todas.reduce((m, l) => (chave(l) > m ? chave(l) : m), "");
        const alvo = email.trim().toLowerCase();
        const niveis = (deps.pessoas.find((x) => x.email === alvo)?.vinculos ?? []).map((v) => v.nivel);
        const linha = todas.find((l) => l.email === alvo && chave(l) === atual);
        return { niveis, pontos: linha ? linha.pontos : 0 };
      })().catch((e) => { console.error(e); return null; }),
    ]);
    const pontos = pontuacao && elegivelRanking(cadastro?.cargo ?? null, pontuacao.niveis) ? pontuacao.pontos : null;
    const elogiosPublicos = proprio || privacidade.mostrarElogios ? elogios : [];
    const nascimento = proprio || privacidade.mostrarAniversario ? (cadastro?.nascimento ?? null) : null;
    return {
      ...vazio, ...(cadastro ?? {}), nascimento, gestor, treinamentos, sobre, privacidade, pontos,
      elogiosTotal: elogiosPublicos.length,
      elogios: elogiosPublicos.slice(0, 3).map((e) => ({ id: e.id, data: e.data, texto: e.detalhamento, autor: e.elogiador })),
      erro: erros.length ? "Alguns dados do SharePoint não puderam ser carregados agora." : null,
    };
  }

/** Cargo e setor (SharePoint) de até 8 colegas ativos, para a pesquisa do topo. */
export const subtitulosColegas = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { ids: string[] }) => {
    if (!d || !Array.isArray(d.ids) || d.ids.length > 8 || d.ids.some((i) => typeof i !== "string" || !/^[0-9a-f-]{36}$/i.test(i))) throw new Error("Pesquisa inválida");
    return d;
  })
  .handler(async ({ context, data }): Promise<Record<string, string>> => {
    const { data: eu } = await context.supabase.from("profiles").select("is_active").eq("id", context.userId).maybeSingle();
    if (!eu || eu.is_active === false) throw new Error("Unauthorized");
    if (!data.ids.length) return {};
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: perfis } = await supabaseAdmin.from("profiles").select("id,email,is_active").in("id", data.ids);
    const { cadastroDoEmail } = await import("@/lib/perfil.server");
    const out: Record<string, string> = {};
    await Promise.all((perfis ?? []).filter((p) => p.email && p.is_active !== false).map(async (p) => {
      const c = await cadastroDoEmail(p.email!).catch(() => null);
      const s = [c?.cargo, c?.departamento].filter(Boolean).join(" · ");
      if (s) out[p.id] = s;
    }));
    return out;
  });
