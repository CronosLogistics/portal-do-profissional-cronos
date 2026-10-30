/**
 * Catálogo fixo de permissões do portal. Deve espelhar a lista validada no banco
 * (perfil_permissoes.permissao). Módulo novo com controle = nova permissão aqui e no banco.
 */
export const PERMISSOES = [
  { codigo: "admin.usuarios", nome: "Gerenciar usuários", descricao: "Ver a aba Usuários, adicionar e remover perfis das pessoas e sincronizar com o Microsoft 365." },
  { codigo: "admin.perfis", nome: "Gerenciar perfis", descricao: "Criar, renomear e desativar perfis e marcar as permissões de cada um." },
  { codigo: "avisos.publicar", nome: "Publicar avisos", descricao: "Criar avisos em nome dos perfis de que a pessoa faz parte." },
  { codigo: "avisos.gerenciar", nome: "Gerenciar avisos", descricao: "Editar e arquivar avisos de qualquer perfil." },
  { codigo: "avisos.insider", nome: "Publicar o Cronos Insider", descricao: "Ver a opção Cronos Insider em Novo aviso; a edição fica 3 dias no carrossel da página Início." },
  { codigo: "conteudo.editar", nome: "Editar conteúdos", descricao: "Cadastrar benefícios, parceiros, recompensas e textos do portal." },
  { codigo: "documentos.gerenciar", nome: "Gerenciar documentos", descricao: "Incluir, editar e remover links na página Documentos." },
  { codigo: "formularios.gerenciar", nome: "Gerenciar formulários", descricao: "Adicionar e editar links na página Formulários." },
] as const;

export type Permissao = (typeof PERMISSOES)[number]["codigo"];

export type PerfilAtribuido = { id: string; nome: string; ativo: boolean; sistema: boolean; permissoes: string[] };

/** Soma as permissões dos perfis ativos; profissional inativo não tem nenhuma; perfil de sistema tem todas. */
export function permissoesEfetivas(usuarioAtivo: boolean, perfis: PerfilAtribuido[]): Permissao[] {
  if (!usuarioAtivo) return [];
  const set = new Set<string>();
  for (const p of perfis) {
    if (!p.ativo) continue;
    if (p.sistema) PERMISSOES.forEach((c) => set.add(c.codigo));
    else p.permissoes.forEach((c) => set.add(c));
  }
  return PERMISSOES.map((c) => c.codigo).filter((c) => set.has(c));
}

/** Perfil sem membros e sem avisos pode ser excluído; os demais só desativados. */
export function podeExcluirPerfil(p: { sistema: boolean; membros: number; avisos?: number }) {
  return !p.sistema && p.membros === 0 && (p.avisos ?? 0) === 0;
}
