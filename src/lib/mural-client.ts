import { criarIdCliente } from "@/lib/client-id";
import { supabase } from "@/integrations/supabase/client";

export const muralKey = ["mural"] as const;
export const EMOJIS_MURAL = ["👍", "❤️", "👏", "🎉", "😮"] as const;
export type EmojiMural = (typeof EMOJIS_MURAL)[number];
export type ReacaoMural = { emoji: string; total: number; meu: boolean };

export type ComentarioMural = { id: string; texto: string; criado_em: string; editado_em: string | null; usuario_id: string; nome: string };
export type PostMural = {
  id: string; titulo: string; texto: string; imagem_path: string | null;
  data_post: string; visivel_ate: string | null; criado_em: string; comentarios: ComentarioMural[];
  tipo: TipoMural; anos_casa: number | null; publicar_em: string | null;
  reacoes: ReacaoMural[]; minha_reacao: string | null;
};
export type TipoMural = "geral" | "aniversario" | "tempo_casa";
export type PostVigente = { id: string; titulo: string; texto: string; imagem_path: string | null; data_post: string; tipo: TipoMural; anos_casa: number | null };

/** Post ainda não visível ao público: data futura ou publicar_em no futuro. */
export function postAgendado(p: Pick<PostMural, "data_post" | "publicar_em">, hoje = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" }), agora = new Date()) {
  return p.data_post > hoje || Boolean(p.publicar_em && new Date(p.publicar_em) > agora);
}

export async function listarMural(): Promise<PostMural[]> {
  const { data, error } = await supabase.rpc("listar_mural_com_reacoes");
  if (error) throw error;
  return (data ?? []).map((p) => ({
    ...p,
    comentarios: (p.comentarios as unknown as ComentarioMural[]) ?? [],
    reacoes: (p.reacoes as unknown as ReacaoMural[]) ?? [],
    minha_reacao: (p.minha_reacao as string | null) ?? null,
    tipo: p.tipo as TipoMural,
  }));
}

export async function muralVigentes(): Promise<PostVigente[]> {
  const { data, error } = await supabase.rpc("mural_vigentes");
  if (error) throw error;
  return (data ?? []).map((p) => ({ ...p, tipo: p.tipo as TipoMural }));
}

/** Bucket privado: gera link temporário (1h) para exibir a imagem. */
export async function urlImagem(path: string | null): Promise<string | null> {
  if (!path) return null;
  const { data } = await supabase.storage.from("mural").createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}

export type DadosPost = { titulo: string; texto: string; data_post: string; visivel_ate: string | null; tipo: TipoMural; anos_casa: number | null; publicar_em?: string | null; arquivo?: File | null; imagem_path?: string | null };

export async function salvarPost(id: string | null, d: DadosPost) {
  let imagem_path = d.imagem_path ?? null;
  if (d.arquivo) {
    const ext = d.arquivo.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${criarIdCliente()}.${ext}`;
    const { error } = await supabase.storage.from("mural").upload(path, d.arquivo, { contentType: d.arquivo.type });
    if (error) throw new Error("Não foi possível enviar a imagem.");
    imagem_path = path;
  }
  const row = { titulo: d.titulo.trim(), texto: d.texto.trim(), data_post: d.data_post, visivel_ate: d.visivel_ate || null, imagem_path, tipo: d.tipo, anos_casa: d.tipo === "tempo_casa" ? d.anos_casa : null, publicar_em: d.publicar_em ?? null };
  const { error } = id
    ? await supabase.from("mural_posts").update(row).eq("id", id)
    : await supabase.from("mural_posts").insert(row);
  if (error) throw new Error("Você não tem permissão para publicar no mural.");
}

export async function excluirPost(id: string) {
  const { error } = await supabase.from("mural_posts").delete().eq("id", id);
  if (error) throw error;
}

export async function comentar(post_id: string, texto: string) {
  const { error } = await supabase.from("mural_comentarios").insert({ post_id, texto: texto.trim() });
  if (error) throw error;
}
export async function editarComentario(id: string, texto: string) {
  const { error } = await supabase.from("mural_comentarios").update({ texto: texto.trim() }).eq("id", id);
  if (error) throw error;
}
export async function apagarComentario(id: string) {
  const { error } = await supabase.from("mural_comentarios").delete().eq("id", id);
  if (error) throw error;
}

/** Uma reação por pessoa: troca o emoji ou remove se clicar de novo no mesmo. */
export async function reagirPost(postId: string, emoji: EmojiMural, atual: string | null) {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) throw new Error("Sessão expirada.");
  if (atual === emoji) {
    const { error } = await supabase.from("mural_reacoes").delete().eq("post_id", postId).eq("usuario_id", uid);
    if (error) throw error;
    return;
  }
  const { error } = await supabase.from("mural_reacoes").upsert(
    { post_id: postId, usuario_id: uid, emoji },
    { onConflict: "post_id,usuario_id" },
  );
  if (error) throw error;
}

export async function marcarMuralLido(postId: string) {
  const { error } = await supabase.rpc("marcar_mural_lido", { _post_id: postId });
  if (error) throw error;
}
