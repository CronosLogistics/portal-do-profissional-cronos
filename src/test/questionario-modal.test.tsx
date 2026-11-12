import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { Questionario } from "@/lib/questionarios.rules";
import { chaveRascunhoRespostaLocal } from "@/lib/questionarios-resposta-local";

const usuarioId = "10000000-0000-0000-0000-000000000099";
const { responder } = vi.hoisted(() => ({ responder: vi.fn().mockResolvedValue({ registrado: true }) }));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@/lib/questionarios.functions", () => ({ criarQuestionario: vi.fn(), editarQuestionario: vi.fn(), responderQuestionario: responder }));
vi.mock("@/lib/questionarios-rascunhos.functions", () => ({ excluirRascunhoQuestionario: vi.fn(), importarQuestionarioForms: vi.fn(), salvarRascunhoQuestionario: vi.fn() }));
vi.mock("@/lib/avisos-client", () => ({ avisosKey: ["avisos"] }));
vi.mock("@/components/portal/EditorTexto", () => ({ EditorTexto: () => null }));
vi.mock("@/hooks/useAuth", () => ({ useCurrentUser: () => ({ data: { id: "10000000-0000-0000-0000-000000000099" } }) }));
import { QuestionarioModal } from "@/components/portal/QuestionarioModal";

vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
const rolar = vi.fn();
Element.prototype.scrollIntoView = rolar;

afterEach(() => { cleanup(); vi.clearAllMocks(); localStorage.clear(); });

const questionario: Questionario = {
  id: "10000000-0000-0000-0000-000000000001", titulo: "Pesquisa de experiência", descricao: "", anonimo: true, respondido: false,
  perguntas: [
    { id: "multi", tipo: "checkbox", enunciado: "O que você achou?", opcoes: ["Amei!", "Gostei"] },
    { id: "info", tipo: "bloco", enunciado: "<p>Conte sua experiência</p>" },
    { id: "unica", tipo: "radio", enunciado: "Recomendaria?", opcoes: ["Sim", "Não"] },
    { id: "texto", tipo: "texto", enunciado: "Comentário" },
  ],
};

function abrir(formulario = questionario) {
  const onClose = vi.fn();
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><QuestionarioModal questionario={formulario} onClose={onClose} /></QueryClientProvider>);
  return onClose;
}

it("envia as perguntas publicadas com checkbox, rádio, texto e bloco informativo", async () => {
  const onClose = abrir();
  fireEvent.click(screen.getByRole("checkbox", { name: "Amei!" }));
  fireEvent.click(screen.getByRole("radio", { name: "Sim" }));
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "Muito bom" } });
  const enviar = screen.getByRole("button", { name: "Enviar resposta" });
  expect(enviar).toBeEnabled();
  fireEvent.click(enviar);
  await waitFor(() => expect(responder).toHaveBeenCalledWith({ data: { id: questionario.id, respostas: [["Amei!"], null, "Sim", "Muito bom"] } }));
  await waitFor(() => expect(onClose).toHaveBeenCalled());
});

it("permite tentar enviar e direciona à primeira obrigatória pendente sem enviar respostas incompletas", () => {
  abrir();
  fireEvent.click(screen.getByRole("checkbox", { name: "Amei!" }));
  const enviar = screen.getByRole("button", { name: "Enviar resposta" });
  expect(enviar).toBeEnabled();
  fireEvent.click(enviar);
  expect(rolar).toHaveBeenCalled();
  expect(screen.getByRole("radio", { name: "Sim" })).toHaveFocus();
  expect(responder).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("radio", { name: "Sim" }));
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "   " } });
  fireEvent.click(enviar);
  expect(screen.getByRole("textbox")).toHaveFocus();
  expect(responder).not.toHaveBeenCalled();
});

it("envia com comentário opcional vazio", async () => {
  abrir({ ...questionario, perguntas: questionario.perguntas.map(p => p.tipo === "texto" ? { ...p, obrigatoria: false } : p) });
  fireEvent.click(screen.getByRole("checkbox", { name: "Amei!" }));
  fireEvent.click(screen.getByRole("radio", { name: "Sim" }));
  fireEvent.click(screen.getByRole("button", { name: "Enviar resposta" }));
  await waitFor(() => expect(responder).toHaveBeenCalledWith({ data: { id: questionario.id, respostas: [["Amei!"], null, "Sim", ""] } }));
});

it("salva o progresso no localStorage e restaura ao reabrir", async () => {
  const onClose = abrir();
  fireEvent.click(screen.getByRole("checkbox", { name: "Amei!" }));
  fireEvent.click(screen.getByRole("radio", { name: "Sim" }));
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "Parcial" } });
  await waitFor(() => expect(localStorage.getItem(chaveRascunhoRespostaLocal(usuarioId, questionario.id))).toBeTruthy());
  fireEvent.click(screen.getByRole("button", { name: "Continuar depois" }));
  expect(onClose).toHaveBeenCalled();
  cleanup();
  abrir();
  await waitFor(() => expect(screen.getByRole("checkbox", { name: "Amei!" })).toBeChecked());
  expect(screen.getByRole("radio", { name: "Sim" })).toBeChecked();
  expect(screen.getByRole("textbox")).toHaveValue("Parcial");
});

it("remove o rascunho local após enviar a resposta", async () => {
  abrir();
  fireEvent.click(screen.getByRole("checkbox", { name: "Amei!" }));
  fireEvent.click(screen.getByRole("radio", { name: "Sim" }));
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "Muito bom" } });
  await waitFor(() => expect(localStorage.getItem(chaveRascunhoRespostaLocal(usuarioId, questionario.id))).toBeTruthy());
  fireEvent.click(screen.getByRole("button", { name: "Enviar resposta" }));
  await waitFor(() => expect(responder).toHaveBeenCalled());
  await waitFor(() => expect(localStorage.getItem(chaveRascunhoRespostaLocal(usuarioId, questionario.id))).toBeNull());
});