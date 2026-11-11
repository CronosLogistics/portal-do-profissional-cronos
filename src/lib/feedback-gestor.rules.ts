import type { ItemAnaliseNC } from "./pendencias.rules";
import type { PessoaSharePoint } from "./pendencias-pessoas.rules";
import { normalizarEmail, type SnapshotDepartamentos } from "./departamentos.rules";

/** Feedback visibility is narrower than the all-descendants priority scope. */
export function emailsFeedbacksLiderados(snapshot: SnapshotDepartamentos, email: string): string[] {
  const proprio = normalizarEmail(email);
  const pessoa = snapshot.pessoas.find(p => normalizarEmail(p.email) === proprio);
  if (!pessoa) return [];
  const alvos = pessoa.vinculos.flatMap(vinculo => {
    const membros = snapshot.pessoas.filter(p => p.vinculos.some(v => v.departamento === vinculo.departamento));
    const temCoordenador = membros.some(p => p.vinculos.some(v => v.departamento === vinculo.departamento && v.nivel === "coordenador"));
    return membros.filter(p => p.departamento !== null && p.vinculos.some(v => {
      if (v.departamento !== vinculo.departamento) return false;
      if (vinculo.nivel === "lider") return v.nivel === (temCoordenador ? "coordenador" : "supervisor");
      if (vinculo.nivel === "coordenador") return v.nivel === "supervisor" || v.nivel === "liderado";
      if (vinculo.nivel === "supervisor") return v.nivel === "liderado";
      return false;
    })).map(p => normalizarEmail(p.email));
  });
  return [...new Set(alvos)].filter(alvo => alvo && alvo !== proprio);
}

export type FeedbackGestor = { id: string; profissional: string; gestor: string; data: string; classificacao: string; status: string; mensagem: string; link: string };

/** Texto simples: conteúdo externo nunca é executado nem inserido como HTML. */
export function textoFeedback(html: unknown): string {
  const entidades: Record<string, string> = { nbsp: " ", amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
  return String(html ?? "")
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, "")
    .replace(/<br\s*\/?\s*>|<\/(?:div|p|li|h[1-6])\s*>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&(#x[\da-f]+|#\d+|nbsp|amp|lt|gt|quot|apos);/gi, (original, entidade: string) => {
      const e = entidade.toLowerCase();
      if (!e.startsWith("#")) return entidades[e] ?? original;
      const n = e.startsWith("#x") ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : "";
    }).replace(/\n{3,}/g, "\n\n").trim();
}

/** Profissional_ID referencia Profissionais Brasil, não a lista de usuários do site. */
export function feedbacksDoProfissional(itens: ItemAnaliseNC[], profissionais: ItemAnaliseNC[], usuarios: Map<string, PessoaSharePoint>, email: string): FeedbackGestor[] {
  const alvo = email.trim().toLowerCase();
  if (!alvo) return [];
  const destinatarios = new Map(profissionais.filter(p => usuarios.get(String(p.fields["E_x002d_MAILCORPORATIVOLookupId"] ?? ""))?.email.trim().toLowerCase() === alvo).map(p => [p.id, p]));
  return itens.flatMap((item): FeedbackGestor[] => {
    const f = item.fields;
    const profissional = destinatarios.get(String(f["Profissional_IDLookupId"] ?? ""));
    if (!profissional) return [];
    const gestor = usuarios.get(String(f["AutorLookupId"] ?? f["AuthorLookupId"] ?? ""));
    return [{ id: item.id, profissional: String(profissional.fields["Title"] ?? f["Title"] ?? ""), gestor: gestor?.nome ?? "Não informado", data: String(f["DatadoFeedback"] ?? ""), classificacao: String(f["Classifica_x00e7__x00e3_o"] ?? ""), status: String(f["Status"] ?? ""), mensagem: textoFeedback(f["Coment_x00e1_rio"]), link: `https://cronoslogisticscombr.sharepoint.com/sites/peoplemanagementteamgroup/Lists/Feedbacks%20Gestores/DispForm.aspx?ID=${encodeURIComponent(item.id)}` }];
  }).sort(ordenarFeedbacks);
}

const ts = (d: string) => { const t = new Date(d).getTime(); return Number.isFinite(t) ? t : 0; };
/** Mais recente primeiro; empate pelo ID mais novo. */
export function ordenarFeedbacks(a: { data: string; id: string }, b: { data: string; id: string }): number {
  return ts(b.data) - ts(a.data) || b.id.localeCompare(a.id, undefined, { numeric: true });
}