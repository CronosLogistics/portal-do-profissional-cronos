import { criarIdCliente } from "./client-id";
import { z } from "zod";
import { htmlComConteudo, limparTextoFormatado, textoPlano } from "./rich-text";

export const tiposPergunta = ["texto", "radio", "checkbox", "bloco"] as const;
export type TipoPergunta = (typeof tiposPergunta)[number];
export const MAXIMO_OPCOES_PERGUNTA = 25;

const idPergunta = z.string().trim().min(1).max(80);
const opcaoSchema = z.string().trim().min(1).max(200);
const enunciadoSimples = z.string().trim().min(1).max(1000);
const enunciadoRico = z.string().max(5000).transform(v => limparTextoFormatado(v)).refine(htmlComConteudo, "Texto obrigatório");
const descricaoRica = z.string().max(10000).transform(v => limparTextoFormatado(v));
export const prazoQuestionarioSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v => {
  const d = new Date(`${v}T12:00:00Z`);
  return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === v;
}, "Data inválida").nullable().optional();
export const hojeQuestionarioBrasil = (agora = new Date()) => agora.toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
export const questionarioExpirado = (q: { expira_em?: string | null; expirado?: boolean }, agora = new Date()) =>
  q.expira_em ? hojeQuestionarioBrasil(agora) > q.expira_em : Boolean(q.expirado);
export const formatarPrazoQuestionario = (data: string) => data.split("-").reverse().join("/");

const opcoesEscolha = z.array(opcaoSchema).min(2).max(MAXIMO_OPCOES_PERGUNTA);
const obrigatoria = z.boolean().optional();
const perguntaTexto = z.object({ id: idPergunta, tipo: z.literal("texto"), enunciado: enunciadoSimples, obrigatoria });
const perguntaRadio = z.object({ id: idPergunta, tipo: z.literal("radio"), enunciado: enunciadoSimples, opcoes: opcoesEscolha, obrigatoria });
const perguntaCheckbox = z.object({ id: idPergunta, tipo: z.literal("checkbox"), enunciado: enunciadoSimples, opcoes: opcoesEscolha, obrigatoria });
const perguntaBloco = z.object({ id: idPergunta, tipo: z.literal("bloco"), enunciado: enunciadoRico });
export const perguntaSchema = z.discriminatedUnion("tipo", [perguntaTexto, perguntaRadio, perguntaCheckbox, perguntaBloco]);
export type PerguntaQuestionario = z.infer<typeof perguntaSchema>;

/** Questions are required unless explicitly marked optional (legacy forms stay required). */
export const perguntaObrigatoria = (p: PerguntaQuestionario) => p.tipo !== "bloco" && p.obrigatoria !== false;
export const respostaVazia = (r: unknown) => r === null || r === undefined || (typeof r === "string" && r.trim() === "") || (Array.isArray(r) && r.length === 0);
/** Whether the respondent may submit: every required question answered. */
export const respostasCompletas = (perguntas: PerguntaQuestionario[], respostas: RespostaItem[]) =>
  perguntas.every((p, i) => !perguntaObrigatoria(p) || !respostaVazia(respostas[i]));

/** Accept legacy string[] snapshots and normalize to typed questions. */
export function normalizarPerguntas(raw: unknown): PerguntaQuestionario[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item, i) => {
    if (typeof item === "string") return perguntaSchema.parse({ id: `legado-${i + 1}`, tipo: "texto", enunciado: item });
    return perguntaSchema.parse(item);
  });
}

const perguntasSchema = z.array(z.unknown()).min(1).max(70)
  .superRefine((raw, ctx) => {
    try { normalizarPerguntas(raw); }
    catch (e) {
      ctx.addIssue({ code: "custom", message: e instanceof z.ZodError ? e.errors[0]?.message ?? "Pergunta inválida" : "Pergunta inválida" });
    }
  })
  .transform(normalizarPerguntas)
  .refine(ps => ps.some(p => p.tipo !== "bloco"), "Inclua ao menos uma pergunta respondível");

export const novoQuestionarioSchema = z.object({
  titulo: z.string().trim().min(1).max(200),
  descricao: descricaoRica,
  anonimo: z.boolean(),
  perguntas: perguntasSchema,
  expira_em: prazoQuestionarioSchema,
});
export const editarQuestionarioSchema = novoQuestionarioSchema.extend({ id: z.string().uuid() });
export const idQuestionarioSchema = z.object({ id: z.string().uuid() });

const respostaItemSchema = z.union([z.string(), z.array(z.string()), z.null()]);
export type RespostaItem = z.infer<typeof respostaItemSchema>;

export function validarRespostas(perguntas: PerguntaQuestionario[], respostas: unknown): RespostaItem[] {
  if (!Array.isArray(respostas) || respostas.length !== perguntas.length) throw new Error("Responda todas as perguntas");
  return perguntas.map((p, i) => {
    const r = respostas[i];
    if (p.tipo === "bloco") {
      if (r !== null && r !== undefined && r !== "") throw new Error("Bloco descritivo não recebe resposta");
      return null;
    }
    if (!perguntaObrigatoria(p) && respostaVazia(r)) return p.tipo === "checkbox" ? [] : "";
    if (p.tipo === "texto") {
      const texto = z.string().trim().min(1).max(5000).parse(r);
      return texto;
    }
    if (p.tipo === "radio") {
      const escolhida = z.string().trim().min(1).max(200).parse(r);
      if (!p.opcoes.includes(escolhida)) throw new Error("Opção inválida");
      return escolhida;
    }
    const escolhidas = z.array(z.string().trim().min(1).max(200)).min(1).max(MAXIMO_OPCOES_PERGUNTA).parse(r);
    if (escolhidas.some(o => !p.opcoes.includes(o)) || new Set(escolhidas).size !== escolhidas.length) throw new Error("Opções inválidas");
    return escolhidas;
  });
}

export const respostaQuestionarioSchema = z.object({
  id: z.string().uuid(),
  respostas: z.array(respostaItemSchema).min(1).max(70),
}).superRefine((data, ctx) => {
  // Questions are validated against the live form in the RPC; shape-only check here.
  if (data.respostas.every(r => r === null)) ctx.addIssue({ code: "custom", message: "Responda todas as perguntas", path: ["respostas"] });
});

export type Questionario = {
  id: string;
  titulo: string;
  descricao: string;
  anonimo: boolean;
  perguntas: PerguntaQuestionario[];
  respondido: boolean;
  excluindo?: boolean;
  expira_em?: string | null;
  expirado?: boolean;
};
export type GestaoQuestionario = {
  total: number;
  respondidos: number;
  pendentes: number;
  pessoasPendentes: { nome: string; email: string }[] | null;
  respostas: { perguntas: PerguntaQuestionario[]; respostas: RespostaItem[]; nome: string | null; email: string | null }[];
  sharepointPendente: boolean;
};

export function enunciadoPlano(p: PerguntaQuestionario | string) {
  if (typeof p === "string") return p;
  return p.tipo === "bloco" ? textoPlano(p.enunciado) : p.enunciado;
}

export function formatarResposta(r: RespostaItem) {
  if (r === null || r === undefined) return "";
  return Array.isArray(r) ? r.join(", ") : r;
}

export function camposRegistro(
  formulario: { id: string; titulo: string; anonimo: boolean },
  perguntas: Array<PerguntaQuestionario | string>,
  respostas: RespostaItem[],
  criador: string,
  respondente: string,
) {
  const pares = perguntas.map((p, i) => ({ p, r: respostas[i] ?? null })).filter(({ p }) => typeof p === "string" || p.tipo !== "bloco");
  return {
    Pergunta: pares.map(({ p }, i) => `${i + 1}. ${enunciadoPlano(p)}`).join("\n\n"),
    Resposta: pares.map(({ r }, i) => `${i + 1}. ${formatarResposta(r)}`).join("\n\n"),
    NomedoFormul_x00e1_rio: formulario.titulo,
    CriadordoFormul_x00e1_rio: criador,
    Respondidopor: formulario.anonimo ? "Anônimo" : respondente,
  };
}

export function perguntaPadrao(tipo: TipoPergunta = "texto", id: string = criarIdCliente()): PerguntaQuestionario {
  if (tipo === "bloco") return { id, tipo, enunciado: "" };
  if (tipo === "radio" || tipo === "checkbox") return { id, tipo, enunciado: "", opcoes: ["", ""], obrigatoria: true };
  return { id, tipo: "texto", enunciado: "", obrigatoria: true };
}

export function respostasIniciais(perguntas: PerguntaQuestionario[]): RespostaItem[] {
  return perguntas.map(p => (p.tipo === "checkbox" ? [] : p.tipo === "bloco" ? null : ""));
}

/** Browser draft of an in-progress questionnaire answer; restored only when question IDs still match. */
export type RascunhoRespostaLocal = {
  questionarioId: string;
  perguntaIds: string[];
  respostas: RespostaItem[];
  atualizadoEm: string;
};

function respostaRascunhoCompativel(p: PerguntaQuestionario, r: unknown): RespostaItem | undefined {
  if (p.tipo === "bloco") return r === null || r === undefined || r === "" ? null : undefined;
  if (p.tipo === "texto") return typeof r === "string" && r.length <= 5000 ? r : undefined;
  if (p.tipo === "radio") {
    if (typeof r !== "string") return undefined;
    if (!r) return "";
    return p.opcoes.includes(r) ? r : "";
  }
  if (!Array.isArray(r)) return undefined;
  const unicas = [...new Set(r.filter((o): o is string => typeof o === "string" && p.opcoes.includes(o)))];
  return unicas;
}

/** Returns restored answers when the draft matches the published questions; otherwise null. */
export function aplicarRascunhoRespostas(perguntas: PerguntaQuestionario[], rascunho: RascunhoRespostaLocal | null | undefined): RespostaItem[] | null {
  if (!rascunho || rascunho.perguntaIds.length !== perguntas.length) return null;
  if (!perguntas.every((p, i) => p.id === rascunho.perguntaIds[i])) return null;
  if (!Array.isArray(rascunho.respostas) || rascunho.respostas.length !== perguntas.length) return null;
  const aplicadas: RespostaItem[] = [];
  for (let i = 0; i < perguntas.length; i++) {
    const item = respostaRascunhoCompativel(perguntas[i]!, rascunho.respostas[i]);
    if (item === undefined) return null;
    aplicadas.push(item);
  }
  return aplicadas;
}

export function rascunhoRespostaTemProgresso(perguntas: PerguntaQuestionario[], respostas: RespostaItem[]): boolean {
  return perguntas.some((p, i) => {
    const r = respostas[i];
    if (p.tipo === "bloco") return false;
    if (p.tipo === "checkbox") return Array.isArray(r) && r.length > 0;
    return typeof r === "string" && r.trim().length > 0;
  });
}
