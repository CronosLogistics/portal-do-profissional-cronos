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
    obrigatoria: z.boolean(),
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
- obrigatoria: true quando a pergunta tem asterisco (*) de obrigatória no original; false caso contrário (blocos: false).
- Remova numeração, asteriscos de obrigatório e cabeçalhos/rodapés de impressão.
- descricao da pergunta: texto auxiliar abaixo do enunciado, ou null.
- Máximo de 70 itens.`;

const CACHE_MS = 60 * 60 * 1000;
const cache = new Map<string, { em: number; valor: QuestionarioExtraido }>();

async function chaveCache(data: ImportacaoForms): Promise<string> {
  const bytes = new TextEncoder().encode(`${data.pdfBase64 ?? ""}\u0000${data.texto?.trim() ?? ""}`);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function extrairQuestionarioForms(data: ImportacaoForms): Promise<QuestionarioExtraido> {
  const apiKey = process.env["OPENAI_API_KEY"];
  if (!apiKey) throw new Error("Leitura automática não configurada.");
  const chave = await chaveCache(data);
  const agora = Date.now();
  for (const [k, v] of cache) if (agora - v.em >= CACHE_MS) cache.delete(k);
  const emCache = cache.get(chave);
  if (emCache) return emCache.valor;
  const provider = createOpenAI({ apiKey });
  const content: Exclude<ModelMessage, { role: "system" | "tool" | "assistant" }>["content"] = [
    { type: "text", text: "Extraia o formulário a seguir." },
  ];
  if (data.pdfBase64) content.push({ type: "file", filename: data.nomeArquivo || "formulario.pdf", data: data.pdfBase64, mediaType: "application/pdf" });
  if (data.texto?.trim()) content.push({ type: "text", text: data.texto.trim() });

  const result = streamText({
    model: provider.responses("gpt-4o-mini"),
    system: INSTRUCOES,
    messages: [{ role: "user", content }],
    output: Output.object({ schema: esquema }),
    maxRetries: 0,
    providerOptions: { openai: { store: false } },
  });
  try {
    const valor = await result.output;
    cache.set(chave, { em: Date.now(), valor });
    return valor;
  } catch (e) {
    if (NoObjectGeneratedError.isInstance(e)) throw new Error("Não foi possível identificar as perguntas. Confira o arquivo e tente novamente.");
    const status = (e as { statusCode?: number }).statusCode;
    console.error("importarQuestionarioForms", status, e);
    if (status === 401 || status === 403) throw new Error("A chave da OpenAI foi recusada. Verifique a chave e as permissões.");
    if (status === 402) throw new Error("Créditos de IA esgotados. Adicione créditos para usar a importação.");
    if (status === 429 && /quota|credit/i.test(String((e as { responseBody?: string }).responseBody ?? ""))) throw new Error("A conta da OpenAI está sem créditos. Adicione saldo na OpenAI para usar a importação.");
    if (status === 429) throw new Error("Muitas solicitações no momento. Aguarde um pouco e tente novamente.");
    throw new Error("Não foi possível ler o formulário agora.");
  }
}
