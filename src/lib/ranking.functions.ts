import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type PodioItem = { posicao: number; userId: string | null; nome: string; subtitulo: string; pontos: number };
export type Podio = { itens: PodioItem[]; periodo: string | null; erro: string | null };

/** Top 3 do semestre mais recente; empates na mesma pontuação compartilham a posição. */
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
      const linhas = todas.filter((l) => chave(l) === atual).sort((a, b) => b.pontos - a.pontos).slice(0, 3);
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: perfis } = await supabaseAdmin.from("profiles").select("id,email,full_name,is_active").in("email", linhas.map((l) => l.email));
      const { cadastroDoEmail } = await import("@/lib/perfil.server");
      let pos = 0, ant = NaN;
      const itens = await Promise.all(linhas.map(async (l, i) => {
        if (l.pontos !== ant) { pos = i + 1; ant = l.pontos; }
        const p = (perfis ?? []).find((x) => x.email?.toLowerCase() === l.email && x.is_active !== false);
        const c = await cadastroDoEmail(l.email).catch(() => null);
        return {
          posicao: pos, userId: p?.id ?? null, pontos: l.pontos,
          nome: (p?.full_name ?? l.email.split("@")[0] ?? "").replace(/\s*-\s*Cronos Logistics$/i, "").trim(),
          subtitulo: [c?.cargo, c?.departamento].filter(Boolean).join(" · "),
        };
      }));
      const [ano, sem] = atual.split("-");
      return { itens, periodo: atual ? `${sem}º semestre de ${Number(ano)}` : null, erro: null };
    } catch (e) {
      console.error("[podio]", e);
      return { itens: [], periodo: null, erro: "Não foi possível carregar o ranking agora." };
    }
  });
