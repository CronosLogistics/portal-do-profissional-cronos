import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { elegivelRanking, ordenarPontuacoes } from "./ranking.rules";

export type PodioItem = { posicao: number; userId: string | null; nome: string; subtitulo: string; pontos: number };
export type Podio = { itens: PodioItem[]; periodo: string | null; erro: string | null };

/** Top 3 do semestre mais recente; empates são desfeitos por quem atingiu a pontuação primeiro. */
export const podioTreinamentos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Podio> => {
    const { data: eu } = await context.supabase.from("profiles").select("is_active").eq("id", context.userId).maybeSingle();
    if (!eu || eu.is_active === false) throw new Error("Unauthorized");
    try {
      const { pontuacoesSemestre } = await import("./ranking-treinamentos.server");
      const todas = await pontuacoesSemestre();
      const chave = (l: { ano: string; semestre: string }) => `${l.ano.padStart(4, "0")}-${l.semestre}`;
      const atual = todas.reduce((m, l) => (chave(l) > m ? chave(l) : m), "");
      const linhas = ordenarPontuacoes(todas.filter((l) => chave(l) === atual));
      if (!linhas.length) return { itens: [], periodo: null, erro: null };
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: perfis, error } = await supabaseAdmin.from("profiles").select("id,email,full_name,is_active").in("email", linhas.map((l) => l.email)).eq("is_active", true);
      if (error) throw error;
      const { cadastroDoEmail } = await import("@/lib/perfil.server");
      const { consultarDepartamentos } = await import("./departamentos.server");
      const departamentos = await consultarDepartamentos();
      const itens: PodioItem[] = [];
      for (const l of linhas) {
        const p = (perfis ?? []).find((x) => x.email?.trim().toLowerCase() === l.email);
        if (!p) continue;
        const vinculos = departamentos.pessoas.find(x => x.email === l.email)?.vinculos ?? [];
        if (!elegivelRanking(null, vinculos.map(v => v.nivel))) continue;
        const c = await cadastroDoEmail(l.email);
        if (!c || !elegivelRanking(c.cargo, vinculos.map(v => v.nivel))) continue;
        itens.push({
          posicao: itens.length + 1, userId: p.id, pontos: l.pontos,
          nome: (p.full_name ?? l.email.split("@")[0] ?? "").replace(/\s*-\s*Cronos Logistics$/i, "").trim(),
          subtitulo: [c?.cargo, c?.departamento].filter(Boolean).join(" · "),
        });
        if (itens.length === 3) break;
      }
      const [ano, sem] = atual.split("-");
      return { itens, periodo: atual ? `${sem}º semestre de ${Number(ano)}` : null, erro: null };
    } catch (e) {
      console.error("[podio]", e);
      return { itens: [], periodo: null, erro: "Não foi possível carregar o ranking agora." };
    }
  });
