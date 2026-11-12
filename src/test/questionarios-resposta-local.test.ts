import { afterEach, expect, it } from "vitest";
import {
  aplicarRascunhoRespostas,
  rascunhoRespostaTemProgresso,
  respostasIniciais,
  type PerguntaQuestionario,
  type RascunhoRespostaLocal,
} from "@/lib/questionarios.rules";
import {
  chaveRascunhoRespostaLocal,
  gravarRascunhoRespostaLocal,
  limparRascunhoRespostaLocal,
  lerRascunhoRespostaLocal,
  temRascunhoRespostaLocal,
} from "@/lib/questionarios-resposta-local";

const perguntas: PerguntaQuestionario[] = [
  { id: "multi", tipo: "checkbox", enunciado: "O que você achou?", opcoes: ["Amei!", "Gostei"] },
  { id: "info", tipo: "bloco", enunciado: "<p>Conte sua experiência</p>" },
  { id: "unica", tipo: "radio", enunciado: "Recomendaria?", opcoes: ["Sim", "Não"] },
  { id: "texto", tipo: "texto", enunciado: "Comentário" },
];

const usuario = "10000000-0000-0000-0000-000000000099";
const questionarioId = "10000000-0000-0000-0000-000000000001";

afterEach(() => {
  localStorage.clear();
});

it("restaura rascunho compatível e descarta quando as perguntas mudam", () => {
  const rascunho: RascunhoRespostaLocal = {
    questionarioId,
    perguntaIds: perguntas.map(p => p.id),
    respostas: [["Amei!"], null, "Sim", "Muito bom"],
    atualizadoEm: new Date().toISOString(),
  };
  expect(aplicarRascunhoRespostas(perguntas, rascunho)).toEqual([["Amei!"], null, "Sim", "Muito bom"]);
  expect(aplicarRascunhoRespostas(perguntas, { ...rascunho, perguntaIds: ["outro", "info", "unica", "texto"] })).toBeNull();
});

it("remove opções inválidas do rascunho sem invalidar o restante", () => {
  const rascunho: RascunhoRespostaLocal = {
    questionarioId,
    perguntaIds: perguntas.map(p => p.id),
    respostas: [["Amei!", "Sumiu"], null, "Talvez", "ok"],
    atualizadoEm: new Date().toISOString(),
  };
  expect(aplicarRascunhoRespostas(perguntas, rascunho)).toEqual([["Amei!"], null, "", "ok"]);
});

it("grava e limpa progresso no localStorage por usuário e formulário", () => {
  const respostas = [["Gostei"], null, "Não", "parcial"];
  expect(rascunhoRespostaTemProgresso(perguntas, respostasIniciais(perguntas))).toBe(false);
  expect(rascunhoRespostaTemProgresso(perguntas, respostas)).toBe(true);

  gravarRascunhoRespostaLocal(usuario, questionarioId, perguntas, respostas);
  expect(localStorage.getItem(chaveRascunhoRespostaLocal(usuario, questionarioId))).toBeTruthy();
  expect(lerRascunhoRespostaLocal(usuario, questionarioId)?.respostas).toEqual(respostas);
  expect(temRascunhoRespostaLocal(usuario, questionarioId, perguntas)).toBe(true);

  limparRascunhoRespostaLocal(usuario, questionarioId);
  expect(temRascunhoRespostaLocal(usuario, questionarioId, perguntas)).toBe(false);
});

it("não mantém rascunho vazio no localStorage", () => {
  gravarRascunhoRespostaLocal(usuario, questionarioId, perguntas, respostasIniciais(perguntas));
  expect(localStorage.getItem(chaveRascunhoRespostaLocal(usuario, questionarioId))).toBeNull();
});
