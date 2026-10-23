import { supabase } from "@/integrations/supabase/client";

/** Avisos lidos e gravados pelo navegador; o banco aplica permissões, limpeza do HTML e regras de status. */
export type AvisoRecebido = {
  id: string;
  titulo: string;
  mensagem: string;
  perfil_nome: string;
  publicar_em: string;
  expira_em: string | null;
  editado_em: string | null;
  lido: boolean;
};

export type AvisoEnviado = {
  id: string;
  titulo: string;
  mensagem: string;
  perfil_id: string;
  perfil_nome: string;
  autor_id: string;
  autor_nome: string;
  publicar_em: string;
  expira_em: string | null;
  editado_em: string | null;
  arquivado_em: string | null;
  lidos: number;
  ativos: number;
};

export const avisosKey = ["avisos"] as const;
export const POR_PAGINA = 20;

function amigavel(message?: string) {
  const m = message ?? "";
  if (m.includes("row-level security") || m.includes("permission")) return new Error("Você não tem permissão para esta ação.");
  if (m.includes("titulo_check")) return new Error("O título deve ter entre 1 e 120 caracteres.");
  return new Error(m || "Não foi possível concluir a operação.");
}

export async function listarAvisos(soNaoLidos: boolean, limite = POR_PAGINA, deslocamento = 0): Promise<AvisoRecebido[]> {
  const { data, error } = await supabase.rpc("listar_avisos", { _so_nao_lidos: soNaoLidos, _limite: limite, _deslocamento: deslocamento });
  if (error) throw amigavel(error.message);
  return (data ?? []) as AvisoRecebido[];
}

export async function contarNaoLidos(): Promise<number> {
  const { data, error } = await supabase.rpc("contar_nao_lidos");
  if (error) throw amigavel(error.message);
  return Number(data ?? 0);
}

export async function marcarLido(avisoId: string) {
  const { error } = await supabase.from("avisos_leituras").insert({ aviso_id: avisoId });
  if (error && error.code !== "23505") throw amigavel(error.message);
}

export async function marcarTodosLidos() {
  const { error } = await supabase.rpc("marcar_todos_avisos_lidos");
  if (error) throw amigavel(error.message);
}

export async function avisosEnviados(): Promise<AvisoEnviado[]> {
  const { data, error } = await supabase.rpc("avisos_enviados");
  if (error) throw amigavel(error.message);
  return ((data ?? []) as AvisoEnviado[]).map((a) => ({ ...a, lidos: Number(a.lidos), ativos: Number(a.ativos) }));
}

export async function perfisRemetentes(): Promise<{ id: string; nome: string }[]> {
  const { data, error } = await supabase.rpc("meus_perfis_remetentes");
  if (error) throw amigavel(error.message);
  return data ?? [];
}

export type DadosAviso = { perfil_id: string; titulo: string; mensagem: string; publicar_em: string; expira_em: string | null };

export async function salvarAviso(dados: DadosAviso, id?: string) {
  const titulo = dados.titulo.trim();
  if (!titulo) throw new Error("Informe o título.");
  if (titulo.length > 120) throw new Error("O título deve ter no máximo 120 caracteres.");
  if (!dados.perfil_id) throw new Error("Escolha o perfil remetente.");
  const row = { ...dados, titulo };
  const { error } = id
    ? await supabase.from("avisos").update(row).eq("id", id)
    : await supabase.from("avisos").insert(row);
  if (error) throw amigavel(error.message);
}

export async function arquivarAviso(id: string) {
  const { error } = await supabase.from("avisos").update({ arquivado_em: new Date().toISOString() }).eq("id", id);
  if (error) throw amigavel(error.message);
}

export async function cancelarAviso(id: string) {
  const { error } = await supabase.from("avisos").delete().eq("id", id);
  if (error) throw amigavel(error.message);
}
