import { z } from "zod";
import { htmlComConteudo, limparTextoFormatado, textoPlano } from "./rich-text";

export const tiposPergunta = ["texto", "radio", "checkbox", "bloco"] as const;
export type TipoPergunta = (typeof tiposPergunta)[number];

const idPergunta = z.string().trim().min(1).max(80);
const opcaoSchema = z.string().trim().min(1).max(200);
const enunciadoSimples = z.string().trim().min(1).max(1000);
const enunciadoRico = z.string().max(5000).transform(v => limparTextoFormatado(v)).refine(htmlComConteudo, "Texto obrigatório");
const descricaoRica = z.string().max(10000).transform(v => limparTextoFormatado(v));

const opcoesEscolha = z.array(opcaoSchema).min(2).max(20);
const perguntaTexto = z.object({ id: idPergunta, tipo: z.literal("texto"), enunciado: enunciadoSimples });
const perguntaRadio = z.object({ id: idPergunta, tipo: z.literal("radio"), enunciado: enunciadoSimples, opcoes: opcoesEscolha });
const perguntaCheckbox = z.object({ id: idPergunta, tipo: z.literal("checkbox"), enunciado: enunciadoSimples, opcoes: opcoesEscolha });
const perguntaBloco = z.object({ id: idPergunta, tipo: z.literal("bloco"), enunciado: enunciadoRico });
export const perguntaSchema = z.discriminatedUnion("tipo", [perguntaTexto, perguntaRadio, perguntaCheckbox, perguntaBloco]);
export type PerguntaQuestionario = z.infer<typeof perguntaSchema>;

/** Accept legacy string[] snapshots and normalize to typed questions. */
export function normalizarPerguntas(raw: unknown): PerguntaQuestionario[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item, i) => {
    if (typeof item === "string") return perguntaSchema.parse({ id: `legado-${i + 1}`, tipo: "texto", enunciado: item });
    return perguntaSchema.parse(item);
  });
}

const perguntasSchema = z.array(z.unknown()).min(1).max(30)
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
    if (p.tipo === "texto") {
      const texto = z.string().trim().min(1).max(5000).parse(r);
      return texto;
    }
    if (p.tipo === "radio") {
      const escolhida = z.string().trim().min(1).max(200).parse(r);
      if (!p.opcoes.includes(escolhida)) throw new Error("Opção inválida");
      return escolhida;
    }
    const escolhidas = z.array(z.string().trim().min(1).max(200)).min(1).max(20).parse(r);
    if (escolhidas.some(o => !p.opcoes.includes(o)) || new Set(escolhidas).size !== escolhidas.length) throw new Error("Opções inválidas");
    return escolhidas;
  });
}

export const respostaQuestionarioSchema = z.object({
  id: z.string().uuid(),
  respostas: z.array(respostaItemSchema).min(1).max(30),
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

export function perguntaPadrao(tipo: TipoPergunta = "texto", id = crypto.randomUUID()): PerguntaQuestionario {
  if (tipo === "bloco") return { id, tipo, enunciado: "" };
  if (tipo === "radio" || tipo === "checkbox") return { id, tipo, enunciado: "", opcoes: ["", ""] };
  return { id, tipo: "texto", enunciado: "" };
}
