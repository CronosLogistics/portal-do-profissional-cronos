import { z } from "zod";

export const novoQuestionarioSchema = z.object({
  titulo: z.string().trim().min(1).max(200),
  descricao: z.string().trim().max(2000),
  anonimo: z.boolean(),
  perguntas: z.array(z.string().trim().min(1).max(1000)).min(1).max(30),
});
export const respostaQuestionarioSchema = z.object({ id: z.string().uuid(), respostas: z.array(z.string().trim().min(1).max(5000)).min(1).max(30) });
export const idQuestionarioSchema = z.object({ id: z.string().uuid() });
export type Questionario = { id: string; titulo: string; descricao: string; anonimo: boolean; perguntas: string[]; respondido: boolean };
export type GestaoQuestionario = { total: number; respondidos: number; pendentes: number; pessoasPendentes: { nome: string; email: string }[] | null; respostas: { respostas: string[]; nome: string | null; email: string | null }[]; sharepointPendente: boolean };
export function camposRegistro(formulario: { id: string; titulo: string; anonimo: boolean }, pergunta: string, resposta: string, criador: string, respondente: string) {
  return { Pergunta: pergunta, Resposta: resposta, NomedoFormul_x00e1_rio: formulario.titulo, CriadordoFormul_x00e1_rio: criador, Respondidopor: formulario.anonimo ? "Anônimo" : respondente };
}