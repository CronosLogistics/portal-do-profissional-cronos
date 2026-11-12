import { describe, expect, it } from "vitest";
import { respostasCompletas, validarRespostas, type PerguntaQuestionario } from "@/lib/questionarios.rules";

const perguntas: PerguntaQuestionario[] = [
  { id: "a", tipo: "radio", enunciado: "Obrigatória", opcoes: ["Sim", "Não"] },
  { id: "b", tipo: "texto", enunciado: "Opcional", obrigatoria: false },
];

describe("perguntas opcionais", () => {
  it("permite enviar com pergunta opcional em branco", () => {
    expect(respostasCompletas(perguntas, ["Sim", ""])).toBe(true);
    expect(validarRespostas(perguntas, ["Sim", ""])).toEqual(["Sim", ""]);
  });
  it("bloqueia pergunta obrigatória (padrão) em branco", () => {
    expect(respostasCompletas(perguntas, ["", "texto"])).toBe(false);
    expect(() => validarRespostas(perguntas, ["", "x"])).toThrow();
  });
});
