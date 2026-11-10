import { createOpenAI } from "@ai-sdk/openai";
import { NoObjectGeneratedError, Output, streamText, type ModelMessage } from "ai";
import { z } from "zod";
import type { ImportacaoForms, QuestionarioExtraido } from "./questionarios-importacao.rules";

const esquema = z.object({
  titulo: z.string(),
  descricao: z.string(),
  perguntas: z.array(z.object({
    tipo: z.enum(["texto", "radio", "checkbox", "bloco"]),
    enunciado: z.string(),
    descricao: z.string().nullable(),
    opcoes: z.array(z.string()),
  })),
});

const INSTRUCOES = `Você converte formulários do Microsoft Forms (PDF de "Imprimir formulário" ou texto copiado) em perguntas estruturadas.
Regras:
- Preserve o texto original em português, sem inventar perguntas nem opções.
- tipo "radio": escolha única (círculos ○, ou perguntas Sim/Não, CPF/CNPJ etc. com uma resposta).
- tipo "checkbox": múltipla escolha (quadrados ☐ ou "selecione todas que se aplicam").
- tipo "texto": resposta aberta, data, número, e-mail, classificação ou qualquer campo sem lista de opções.
- tipo "bloco": títulos de seção ou textos informativos sem resposta.
- Liste TODAS as opções na ordem; para "texto" e "bloco" use opcoes vazio.
- Remova numeração, asteriscos de obrigatório e cabeçalhos/rodapés de impressão.
- descricao da pergunta: texto auxiliar abaixo do enunciado, ou null.
- Máximo de 70 itens.`;

export async function extrairQuestionarioForms(data: ImportacaoForms): Promise<QuestionarioExtraido> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("Leitura automática não configurada.");
  const provider = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
  });
  const content: Exclude<ModelMessage, { role: "system" | "tool" | "assistant" }>["content"] = [
    { type: "text", text: "Extraia o formulário a seguir." },
  ];
  if (data.pdfBase64) content.push({ type: "file", filename: data.nomeArquivo || "formulario.pdf", data: data.pdfBase64, mediaType: "application/pdf" });
  if (data.texto?.trim()) content.push({ type: "text", text: data.texto.trim() });

  const result = streamText({
    model: provider.responses("openai/gpt-6-astra"),
    system: INSTRUCOES,
    messages: [{ role: "user", content }],
    output: Output.object({ schema: esquema }),
    maxRetries: 0,
    providerOptions: {
      openai: { forceReasoning: true, reasoningEffort: "low", reasoningSummary: "auto", store: false, include: ["reasoning.encrypted_content"] },
    },
  });
  try {
    return await result.output;
  } catch (e) {
    if (NoObjectGeneratedError.isInstance(e)) throw new Error("Não foi possível identificar as perguntas. Confira o arquivo e tente novamente.");
    const status = (e as { statusCode?: number }).statusCode;
    console.error("importarQuestionarioForms", status, e);
    if (status === 402) throw new Error("Créditos de IA esgotados. Adicione créditos para usar a importação.");
    if (status === 429) throw new Error("Muitas solicitações no momento. Aguarde um pouco e tente novamente.");
    throw new Error("Não foi possível ler o formulário agora.");
  }
}
