import { describe, it, expect } from "vitest";
import { importacaoTemPerguntasSuficientes } from "@/lib/questionarios-importacao.rules";
const q = (n: number, tipo = "texto") => Array.from({ length: n }, () => ({ tipo }));
describe("mínimo de perguntas na importação com IA", () => {
  it("recusa 29 perguntas", () => expect(importacaoTemPerguntasSuficientes(q(29))).toBe(false));
  it("aceita 30 perguntas", () => expect(importacaoTemPerguntasSuficientes(q(30))).toBe(true));
  it("blocos de texto não contam", () => expect(importacaoTemPerguntasSuficientes([...q(29), ...q(5, "bloco")])).toBe(false));
});
