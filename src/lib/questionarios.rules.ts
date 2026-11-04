import { z } from "zod";

export const novoQuestionarioSchema = z.object({
  titulo: z.string().trim().min(1).max(200),
  descricao: z.string().trim().max(2000),
  anonimo: z.boolean(),
  perguntas: z.array(z.string().trim().min(1).max(1000)).min(1).max(30),
});
export const respostaQuestionarioSchema = z.object({ id: z.string().uuid(), respostas: z.array(z.string().trim().min(1).max(5000)).min(1).max(30) });
export const editarQuestionarioSchema = novoQuestionarioSchema.extend({ id: z.string().uuid() });
export const idQuestionarioSchema = z.object({ id: z.string().uuid() });
export type Questionario = { id: string; titulo: string; descricao: string; anonimo: boolean; perguntas: string[]; respondido: boolean; excluindo?: boolean };
export type GestaoQuestionario = { total: number; respondidos: number; pendentes: number; pessoasPendentes: { nome: string; email: string }[] | null; respostas: { perguntas: string[]; respostas: string[]; nome: string | null; email: string | null }[]; sharepointPendente: boolean };
export function camposRegistro(formulario: { id: string; titulo: string; anonimo: boolean }, perguntas: string[], respostas: string[], criador: string, respondente: string) {
  return { Pergunta: perguntas.map((p, i) => `${i + 1}. ${p}`).join("\n\n"), Resposta: respostas.map((r, i) => `${i + 1}. ${r}`).join("\n\n"), NomedoFormul_x00e1_rio: formulario.titulo, CriadordoFormul_x00e1_rio: criador, Respondidopor: formulario.anonimo ? "Anônimo" : respondente };
}