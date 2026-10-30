import { supabase } from "@/integrations/supabase/client";
import { criarIdCliente } from "@/lib/client-id";
import { CERTIFICADOS, LINKS, PONTUACAO, STEPS } from "@/components/treinamentos/content";

export const CHAVE_TREINAMENTOS = "treinamentos_conteudo";
const PREFIXO_STORAGE = "storage:";

export const ICONES_ETAPA = ["cadastro", "agenda", "email", "pessoas", "assinatura", "trofeu"] as const;
export type IconeEtapa = (typeof ICONES_ETAPA)[number];

export type EtapaTreino = {
  num: string;
  icone: IconeEtapa;
  title: string;
  description: string;
  bullets: string[];
  ctaLabel: string;
  ctaHref: string;
  image: string;
  imageAlt: string;
  badge: string;
};

export type ConteudoTreinamentos = {
  links: { cadastroTreinamento: string; agendamentoDireto: string; diplomasCertificados: string };
  certificados: { title: string; description: string }[];
  pontuacao: { categoria: string; pontos: number }[];
  notaPontuacao: string;
  etapas: EtapaTreino[];
};

const ICONE_PADRAO: IconeEtapa[] = ["cadastro", "agenda", "email", "pessoas", "assinatura", "email", "trofeu"];

export const CONTEUDO_PADRAO: ConteudoTreinamentos = {
  links: { ...LINKS },
  certificados: CERTIFICADOS.map(({ title, description }) => ({ title, description })),
  pontuacao: PONTUACAO.map((p) => ({ ...p })),
  notaPontuacao:
    "*Demais categorias de treinamento, como Mudança de Função, Onboarding, Intradepartamental, Campanhas e outras capacitações obrigatórias, não geram pontuação na gamificação.",
  etapas: STEPS.map((s, i) => ({
    num: s.num,
    icone: ICONE_PADRAO[i] ?? "cadastro",
    title: s.title,
    description: s.description,
    bullets: s.bullets ?? [],
    ctaLabel: s.cta?.label ?? "",
    ctaHref: s.cta?.href ?? "",
    image: s.image ?? "",
    imageAlt: s.imageAlt ?? "",
    badge: s.badge ?? "",
  })),
};

/** Junta o conteúdo salvo ao padrão, tolerando campos ausentes. */
export function mesclarConteudo(salvo: unknown): ConteudoTreinamentos {
  if (!salvo || typeof salvo !== "object") return CONTEUDO_PADRAO;
  const s = salvo as Partial<ConteudoTreinamentos>;
  return {
    links: { ...CONTEUDO_PADRAO.links, ...(s.links ?? {}) },
    certificados: Array.isArray(s.certificados) ? s.certificados : CONTEUDO_PADRAO.certificados,
    pontuacao: Array.isArray(s.pontuacao) ? s.pontuacao : CONTEUDO_PADRAO.pontuacao,
    notaPontuacao: typeof s.notaPontuacao === "string" ? s.notaPontuacao : CONTEUDO_PADRAO.notaPontuacao,
    etapas: Array.isArray(s.etapas)
      ? s.etapas.map((e) => ({ ...CONTEUDO_PADRAO.etapas[0]!, ...{ image: "", ctaLabel: "", ctaHref: "", badge: "", bullets: [] as string[] }, ...e }))
      : CONTEUDO_PADRAO.etapas,
  };
}

export async function carregarTreinamentos(): Promise<ConteudoTreinamentos> {
  const { data, error } = await supabase.from("site_content").select("value").eq("key", CHAVE_TREINAMENTOS).maybeSingle();
  if (error) throw error;
  if (!data) return CONTEUDO_PADRAO;
  try {
    return mesclarConteudo(JSON.parse(data.value));
  } catch {
    return CONTEUDO_PADRAO;
  }
}

export async function salvarTreinamentos(c: ConteudoTreinamentos) {
  const { error } = await supabase
    .from("site_content")
    .upsert({ key: CHAVE_TREINAMENTOS, value: JSON.stringify(c) }, { onConflict: "key" });
  if (error) throw error;
}

export async function enviarImagemTreino(file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "png";
  const path = `etapas/${criarIdCliente()}.${ext}`;
  const { error } = await supabase.storage.from("treinamentos").upload(path, file, { contentType: file.type });
  if (error) throw error;
  return PREFIXO_STORAGE + path;
}

/** Converte referências do armazenamento em links temporários; URLs comuns ficam iguais. */
export async function resolverImagens(refs: string[]): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  const paths = refs.filter((r) => r.startsWith(PREFIXO_STORAGE)).map((r) => r.slice(PREFIXO_STORAGE.length));
  refs.forEach((r) => { if (r && !r.startsWith(PREFIXO_STORAGE)) out[r] = r; });
  if (paths.length) {
    const { data } = await supabase.storage.from("treinamentos").createSignedUrls(paths, 3600);
    data?.forEach((d) => { if (d.signedUrl && d.path) out[PREFIXO_STORAGE + d.path] = d.signedUrl; });
  }
  return out;
}
