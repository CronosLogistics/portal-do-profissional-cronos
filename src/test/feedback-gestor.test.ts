import { describe, it, expect } from "vitest";
import { emailsFeedbacksLiderados, feedbacksDoProfissional, textoFeedback } from "../lib/feedback-gestor.rules";
import { montarDepartamentos } from "../lib/departamentos.rules";
import { pessoasDoUsuario } from "../lib/pendencias-pessoas.rules";

const usuarios = new Map([["29", { email: "profissional@cronos.com", nome: "Profissional" }], ["17", { email: "gestor@cronos.com", nome: "Gestor" }], ["30", { email: "outro@cronos.com", nome: "Outro" }]]);
const profissionais = [{ id: "46", fields: { Title: "Profissional", E_x002d_MAILCORPORATIVOLookupId: "29" } }, { id: "47", fields: { Title: "Outro", E_x002d_MAILCORPORATIVOLookupId: "30" } }];
const item = { id: "1", fields: { Title: "Profissional", Profissional_IDLookupId: "46", AutorLookupId: "17", Coment_x00e1_rio: "<div>Bom trabalho!</div>", DatadoFeedback: "2026-11-03", Status: "Enviado" } };
const ver = (email: string) => feedbacksDoProfissional([item], profissionais, usuarios, email);
const pessoasHierarquia = new Map([
  ["1", { email: "lider@cronos.com", nome: "Líder" }],
  ["2", { email: "coordenador@cronos.com", nome: "Coordenador" }],
  ["3", { email: "supervisor@cronos.com", nome: "Supervisor" }],
  ["4", { email: "profissional@cronos.com", nome: "Profissional" }],
  ["5", { email: "outro@cronos.com", nome: "Outro" }],
]);
const cadastro = [...pessoasHierarquia.keys()].map(id => ({ id, fields: { Title: id, field_1: "ATIVO", DEPARTAMENTOATUALLookupId: id === "5" ? "externo" : "setor", E_x002d_MAILCORPORATIVOLookupId: id } }));
const hierarquia = (coordenador: string | null = "2") => montarDepartamentos([
  { id: "setor", fields: { Title: "Setor", L_x00ed_derDiretoLookupId: "1", CoordenadorLookupId: coordenador, SupervisorLookupId: "3" } },
  { id: "externo", fields: { Title: "Outro setor" } },
], cadastro, pessoasHierarquia);
describe("Escopo de feedback por hierarquia", () => {
  it("Líder Direto vê coordenadores, não supervisores nem equipe abaixo", () => {
    expect(emailsFeedbacksLiderados(hierarquia(), "lider@cronos.com")).toEqual(["coordenador@cronos.com"]);
  });
  it("Líder Direto vê supervisor quando não há coordenador", () => {
    expect(emailsFeedbacksLiderados(hierarquia(null), "lider@cronos.com")).toEqual(["supervisor@cronos.com"]);
  });
  it("Coordenador vê supervisor e liderados, nunca o líder ou outros setores", () => {
    expect(emailsFeedbacksLiderados(hierarquia(), "coordenador@cronos.com").sort()).toEqual(["profissional@cronos.com", "supervisor@cronos.com"]);
  });
  it("Supervisor vê os liderados e não níveis superiores", () => {
    expect(emailsFeedbacksLiderados(hierarquia(), "supervisor@cronos.com")).toEqual(["profissional@cronos.com"]);
  });
  it("Não amplia acesso de profissional comum ou administrador sem hierarquia", () => {
    expect(emailsFeedbacksLiderados(hierarquia(), "profissional@cronos.com")).toEqual([]);
    expect(emailsFeedbacksLiderados(hierarquia(), "admin@cronos.com")).toEqual([]);
  });
  it("Retorna feedbacks de todos os profissionais autorizados sem incluir o recebido pelo gestor", () => {
    const emails = emailsFeedbacksLiderados(hierarquia(), "coordenador@cronos.com");
    const registros = ["2", "3", "4", "5"].map(id => ({ ...item, id, fields: { ...item.fields, Profissional_IDLookupId: id } }));
    expect(emails.flatMap(email => feedbacksDoProfissional(registros, cadastro, pessoasHierarquia, email)).map(f => f.id).sort()).toEqual(["3", "4"]);
    expect(feedbacksDoProfissional(registros, cadastro, pessoasHierarquia, "coordenador@cronos.com").map(f => f.id)).toEqual(["2"]);
  });
});
describe("Feedback recebido pelo Profissional", () => {
  it("atribui a pendência para responder somente ao Autor, não ao Profissional ou Criado por", () => {
    const registro = { ...item, fields: { ...item.fields, AuthorLookupId: "30" } };
    const pendencias = (email: string) => pessoasDoUsuario("feedback", [registro], email, false, usuarios, new Date("2026-11-03"));
    expect(pendencias("gestor@cronos.com").map(p => p.id)).toEqual(["1"]);
    expect(pendencias("profissional@cronos.com")).toEqual([]);
    expect(pendencias("outro@cronos.com")).toEqual([]);
  });
  it("remove a pendência do Autor após finalização", () => {
    expect(pessoasDoUsuario("feedback", [{ ...item, fields: { ...item.fields, FinalizadoFeeback_x003f_: "Sim" } }], "gestor@cronos.com", false, usuarios, new Date("2026-11-03"))).toEqual([]);
  });
  it("recebe apenas pelo vínculo Profissional e e-mail corporativo verificado", () => {
    expect(ver(" PROFISSIONAL@cronos.com ").map(i => i.id)).toEqual(["1"]);
    expect(ver("gestor@cronos.com")).toEqual([]);
    expect(ver("outro@cronos.com")).toEqual([]);
    expect(ver("")).toEqual([]);
  });
  it("não concede acesso por nome igual nem por IDs de listas diferentes", () => {
    const semVinculo = { ...item, fields: { ...item.fields, Profissional_IDLookupId: "29" } };
    expect(feedbacksDoProfissional([semVinculo], profissionais, usuarios, "profissional@cronos.com")).toEqual([]);
  });
  it("mantém o feedback recebido após a finalização do registro", () => {
    expect(feedbacksDoProfissional([{ ...item, fields: { ...item.fields, Status: "Finalizado", FinalizadoFeeback_x003f_: "Sim" } }], profissionais, usuarios, "profissional@cronos.com")).toHaveLength(1);
  });
  it("resolve o autor e converte o comentário externo em texto seguro", () => {
    expect(ver("profissional@cronos.com")[0]).toMatchObject({ gestor: "Gestor", mensagem: "Bom trabalho!" });
    expect(textoFeedback('<script>alert(1)</script><p>A&amp;B&nbsp;&#x1f680;</p><div>Obrigado</div>')).toBe("A&B 🚀\nObrigado");
  });
});