import { supabase } from "@/integrations/supabase/client";

/** Operações de perfis feitas pelo navegador; o banco confere tem_permissao e as travas. */
export type PerfilResumo = {
  id: string;
  nome: string;
  descricao: string;
  sistema: boolean;
  ativo: boolean;
  permissoes: string[];
  membros: number;
};

function amigavel(message?: string) {
  const m = message ?? "";
  if (m.includes("perfis_nome_unico") || m.toLowerCase().includes("duplicate")) return new Error("Já existe um perfil com esse nome.");
  if (m.includes("row-level security") || m.includes("permission")) return new Error("Você não tem permissão para esta ação.");
  return new Error(m || "Não foi possível concluir a operação.");
}

export async function listarPerfis(): Promise<PerfilResumo[]> {
  const [perfis, perms, membros] = await Promise.all([
    supabase.from("perfis").select("id, nome, descricao, sistema, ativo").order("sistema", { ascending: false }).order("nome"),
    supabase.from("perfil_permissoes").select("perfil_id, permissao"),
    supabase.from("usuario_perfis").select("perfil_id"),
  ]);
  if (perfis.error) throw amigavel(perfis.error.message);
  return (perfis.data ?? []).map((p) => ({
    ...p,
    permissoes: (perms.data ?? []).filter((x) => x.perfil_id === p.id).map((x) => x.permissao),
    membros: (membros.data ?? []).filter((x) => x.perfil_id === p.id).length,
  }));
}

export async function criarPerfil(nome: string, descricao: string) {
  const n = nome.trim().replace(/\s+/g, " ");
  if (!n) throw new Error("Informe o nome do perfil.");
  if (n.length > 60) throw new Error("O nome deve ter no máximo 60 caracteres.");
  const { error } = await supabase.from("perfis").insert({ nome: n, descricao: descricao.trim().slice(0, 300) });
  if (error) throw amigavel(error.message);
}

export async function atualizarPerfil(id: string, patch: { nome?: string; descricao?: string; ativo?: boolean }) {
  const clean = { ...patch, ...(patch.nome !== undefined ? { nome: patch.nome.trim().replace(/\s+/g, " ") } : {}) };
  if (clean.nome !== undefined && !clean.nome) throw new Error("Informe o nome do perfil.");
  const { error } = await supabase.from("perfis").update(clean).eq("id", id);
  if (error) throw amigavel(error.message);
}

export async function excluirPerfil(id: string) {
  const { error } = await supabase.from("perfis").delete().eq("id", id);
  if (error) throw amigavel(error.message);
}

export async function marcarPermissao(perfilId: string, permissao: string, marcado: boolean) {
  const { error } = marcado
    ? await supabase.from("perfil_permissoes").insert({ perfil_id: perfilId, permissao })
    : await supabase.from("perfil_permissoes").delete().eq("perfil_id", perfilId).eq("permissao", permissao);
  if (error) throw amigavel(error.message);
}

export async function adicionarMembro(perfilId: string, usuarioId: string) {
  const { error } = await supabase.from("usuario_perfis").insert({ perfil_id: perfilId, usuario_id: usuarioId });
  if (error && !error.message.includes("duplicate")) throw amigavel(error.message);
}

export async function removerMembro(perfilId: string, usuarioId: string) {
  const { error } = await supabase.from("usuario_perfis").delete().eq("perfil_id", perfilId).eq("usuario_id", usuarioId);
  if (error) throw amigavel(error.message);
}

export async function listarMembros(perfilId: string) {
  const { data, error } = await supabase.rpc("membros_perfil", { _perfil_id: perfilId });
  if (error) throw amigavel(error.message);
  return data ?? [];
}

export async function buscarAtivos(busca: string) {
  const { data, error } = await supabase.rpc("buscar_profissionais_ativos", { _busca: busca });
  if (error) throw amigavel(error.message);
  return data ?? [];
}
