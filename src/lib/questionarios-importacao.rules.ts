import { z } from "zod";
import { criarIdCliente } from "./client-id";
import type { PerguntaQuestionario } from "./questionarios.rules";
import { prazoQuestionarioSchema } from "./questionarios.rules";

export const LIMITE_PDF_BYTES = 8 * 1024 * 1024;

export const importacaoFormsSchema = z.object({
  pdfBase64: z.string().max(Math.ceil(LIMITE_PDF_BYTES * 1.37)).nullable(),
  nomeArquivo: z.string().max(200).nullable(),
  texto: z.string().max(60000).nullable(),
}).refine(d => Boolean(d.pdfBase64) || Boolean(d.texto?.trim()), "Envie um PDF ou cole o texto do formulário.");
export type ImportacaoForms = z.infer<typeof importacaoFormsSchema>;

/** Drafts accept incomplete questions; full validation happens on publish. */
export const rascunhoSchema = z.object({
  id: z.string().uuid().nullable(),
  titulo: z.string().max(200),
  descricao: z.string().max(10000),
  anonimo: z.boolean(),
  expira_em: prazoQuestionarioSchema,
  perguntas: z.array(z.object({
    id: z.string().min(1).max(80),
    tipo: z.enum(["texto", "radio", "checkbox", "bloco"]),
    enunciado: z.string().max(5000),
    opcoes: z.array(z.string().max(200)).max(20).optional(),
    obrigatoria: z.boolean().optional(),
  })).max(70),
});

export type RascunhoQuestionario = {
  id: string; titulo: string; descricao: string; anonimo: boolean;
  perguntas: PerguntaQuestionario[]; atualizado_em: string;
  expira_em?: string | null;
};

export type QuestionarioExtraido = {
  titulo: string;
  descricao: string;
  perguntas: { tipo: string; enunciado: string; descricao: string | null; opcoes: string[]; obrigatoria?: boolean }[];
};

const escapar = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Clamp AI output to what the editor supports; choice questions with <2 options become open text. */
export function normalizarImportacao(raw: QuestionarioExtraido, novoId: () => string = criarIdCliente) {
  const perguntas: PerguntaQuestionario[] = [];
  for (const p of raw.perguntas ?? []) {
    if (perguntas.length >= 70) break;
    const enunciado = (p.enunciado ?? "").trim().slice(0, 1000);
    if (!enunciado) continue;
    const detalhe = p.descricao?.trim();
    if (p.tipo === "bloco") {
      perguntas.push({ id: novoId(), tipo: "bloco", enunciado: `<p><strong>${escapar(enunciado)}</strong></p>${detalhe ? `<p>${escapar(detalhe)}</p>` : ""}` });
      continue;
    }
    const titulo = detalhe ? `${enunciado} — ${detalhe}`.slice(0, 1000) : enunciado;
    const opcoes = [...new Set((p.opcoes ?? []).map(o => o.trim().slice(0, 200)).filter(Boolean))].slice(0, 20);
    if ((p.tipo === "radio" || p.tipo === "checkbox") && opcoes.length >= 2) perguntas.push({ id: novoId(), tipo: p.tipo, enunciado: titulo, opcoes, obrigatoria: p.obrigatoria !== false });
    else perguntas.push({ id: novoId(), tipo: "texto", enunciado: titulo, obrigatoria: p.obrigatoria !== false });
  }
  return {
    titulo: (raw.titulo ?? "").trim().slice(0, 200),
    descricao: raw.descricao?.trim() ? `<p>${escapar(raw.descricao.trim())}</p>` : "",
    perguntas,
  };
}

/** A importação com IA só é aceita quando o conteúdo tem ao menos este número de perguntas (blocos de texto não contam). */
export const MINIMO_PERGUNTAS_IA = 30;
export const contarPerguntasImportadas = (perguntas: { tipo: string }[]) => perguntas.filter(p => p.tipo !== "bloco").length;
export const importacaoTemPerguntasSuficientes = (perguntas: { tipo: string }[]) => contarPerguntasImportadas(perguntas) >= MINIMO_PERGUNTAS_IA;
