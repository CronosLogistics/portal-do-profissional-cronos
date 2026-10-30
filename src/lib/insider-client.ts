import { criarIdCliente } from "@/lib/client-id";
import { supabase } from "@/integrations/supabase/client";
import { conteudoInsiderSchema, type ConteudoInsider } from "./insider.rules";

export type EdicaoInsider = { id: string; mes_ano: string; titulo: string; conteudo: ConteudoInsider; aviso_id: string | null; revisao: number; criado_em: string; atualizado_em: string; origem: string };
export const insiderKey = ["insider-edicoes"] as const;
export async function listarEdicoesInsider(): Promise<EdicaoInsider[]> {
  const { data: perm, error: erro } = await supabase.rpc("tem_permissao", { _permissao: "avisos.insider" });
  if (erro || !perm) throw new Error("Você não tem permissão para editar o Insider.");
  const { data, error } = await supabase.from("insider_edicoes").select("*").order("mes_ano", { ascending: false }).limit(36);
  if (error) throw new Error(error.message);
  return (data ?? []).map(e => ({ ...e, conteudo: conteudoInsiderSchema.parse(e.conteudo) }));
}
export async function lerEdicaoPorAviso(aviso: string): Promise<EdicaoInsider | null> {
  const { data, error } = await supabase.from("insider_edicoes").select("*").eq("aviso_id", aviso).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? { ...data, conteudo: conteudoInsiderSchema.parse(data.conteudo) } : null;
}
export async function publicarEdicao(e: EdicaoInsider, perfil: string) {
  const { data, error } = await supabase.rpc("publicar_edicao_insider", { _id: e.id, _revisao: e.revisao, _perfil: perfil });
  if (error) throw new Error(error.message);
  return data;
}
export async function enviarImagemInsider(id: string, file: File) {
  const tipos: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
  const ext = tipos[file.type];
  if (!ext || file.size > 10 * 1024 * 1024) throw new Error("Use JPG, PNG ou WebP de até 10 MB.");
  const path = `${id}/${criarIdCliente()}.${ext}`;
  const { error } = await supabase.storage.from("insider").upload(path, file, { contentType: file.type });
  if (error) throw new Error(error.message);
  return path;
}
export async function imagensInsider(conteudo: ConteudoInsider): Promise<Record<string, string>> {
  const paths = [...new Set([conteudo.bannerMes, ...conteudo.eventos.map(e => e.imagem), ...conteudo.aniversariantes.map(p => p.foto), ...conteudo.tempoCasa.map(p => p.foto)].filter(Boolean))];
  if (!paths.length) return {};
  const { data, error } = await supabase.storage.from("insider").createSignedUrls(paths, 3600);
  if (error) throw new Error(error.message);
  const urls: Record<string, string> = {};
  for (const item of data ?? []) if (item.path && item.signedUrl) urls[item.path] = item.signedUrl;
  return urls;
}