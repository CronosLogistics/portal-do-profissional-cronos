import type { ItemAnaliseNC } from "./pendencias.rules";
import type { PessoaSharePoint } from "./pendencias-pessoas.rules";

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
  }).sort((a, b) => b.data.localeCompare(a.data) || b.id.localeCompare(a.id, undefined, { numeric: true }));
}