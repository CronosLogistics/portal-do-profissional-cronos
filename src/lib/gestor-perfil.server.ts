import { selecionarGestorPerfil } from "./perfil-gestor.rules";

/** Gestor direto do profissional pela hierarquia sincronizada do SharePoint (mesma regra do perfil). */
export async function gestorDoUsuario(userId: string): Promise<string | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: rel } = await supabaseAdmin.from("departamento_liderados").select("departamento_id,lider_id").eq("liderado_id", userId);
  if (!rel?.length) return null;
  const ids = [...new Set(rel.map((r) => r.lider_id))];
  const [{ data: pessoas }, { data: vinc }] = await Promise.all([
    supabaseAdmin.from("profiles").select("id,full_name,is_active").in("id", ids),
    supabaseAdmin.from("usuario_perfis").select("usuario_id,perfis(departamento_sp_id,nivel_departamento)").in("usuario_id", [...ids, userId]),
  ]);
  return selecionarGestorPerfil(userId, rel, vinc ?? [], pessoas ?? []);
}
