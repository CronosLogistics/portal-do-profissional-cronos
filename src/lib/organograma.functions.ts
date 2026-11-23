import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { AREAS, areaFinal, nivelDoCargo, type Area, type Nivel } from "./organograma.rules";
import { normalizarEmail } from "./departamentos.rules";

export type PessoaOrganograma = { id: string; nome: string; cargo: string | null; departamento: string | null; area: Area; nivel: Nivel; oculto: boolean };

export const carregarOrganograma = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ podeEditar: boolean; pessoas: PessoaOrganograma[]; erro: string | null }> => {
    const sb = context.supabase;
    const { data: eu } = await sb.from("profiles").select("is_active").eq("id", context.userId).maybeSingle();
    if (!eu || eu.is_active === false) throw new Error("Unauthorized");
    const [{ data: pode }, { data: ajustes }] = await Promise.all([
      sb.rpc("pode_editar_organograma"),
      sb.from("organograma_ajustes").select("usuario_id,area,oculto"),
    ]);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: perfis } = await supabaseAdmin.from("profiles").select("id,full_name,email").eq("is_active", true).limit(2000);
    let cad = new Map<string, { cargo: string | null; departamento: string | null }>();
    let erro: string | null = null;
    try {
      const { cadastrosAtivos } = await import("./perfil.server");
      cad = await cadastrosAtivos();
    } catch (e) {
      console.error("Organograma SharePoint", e);
      erro = "Não foi possível ler os cargos do SharePoint agora.";
    }
    const aj = new Map((ajustes ?? []).map((a) => [a.usuario_id, a]));
    const pessoas = (perfis ?? [])
      .map((p) => ({ p, c: cad.get(normalizarEmail(p.email ?? "")) }))
      .filter(({ c }) => erro !== null || c)
      .map(({ p, c }) => {
        const a = aj.get(p.id);
        const cargo = c?.cargo ?? null, departamento = c?.departamento ?? null;
        return { id: p.id, nome: p.full_name || p.email, cargo, departamento, area: areaFinal(a?.area, departamento, cargo), nivel: nivelDoCargo(cargo), oculto: a?.oculto ?? false };
      });
    return { podeEditar: pode === true, pessoas, erro };
  });

export const salvarOrganograma = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { ajustes: { usuario_id: string; area: string; oculto: boolean }[] }) => {
    if (!d || !Array.isArray(d.ajustes) || d.ajustes.length > 1000) throw new Error("Dados inválidos");
    for (const a of d.ajustes) {
      if (!/^[0-9a-f-]{36}$/i.test(a.usuario_id) || !(AREAS as readonly string[]).includes(a.area) || typeof a.oculto !== "boolean") throw new Error("Dados inválidos");
    }
    return d;
  })
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.rpc("salvar_organograma", { _ajustes: data.ajustes });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
