import { describe, it, expect } from "vitest";
import { feedbacksDoProfissional, textoFeedback } from "../lib/feedback-gestor.rules";

const usuarios = new Map([["29", { email: "profissional@cronos.com", nome: "Profissional" }], ["17", { email: "gestor@cronos.com", nome: "Gestor" }], ["30", { email: "outro@cronos.com", nome: "Outro" }]]);
const profissionais = [{ id: "46", fields: { Title: "Profissional", E_x002d_MAILCORPORATIVOLookupId: "29" } }, { id: "47", fields: { Title: "Outro", E_x002d_MAILCORPORATIVOLookupId: "30" } }];
const item = { id: "1", fields: { Title: "Profissional", Profissional_IDLookupId: "46", AutorLookupId: "17", Coment_x00e1_rio: "<div>Bom trabalho!</div>", DatadoFeedback: "2026-11-03", Status: "Enviado" } };
const ver = (email: string) => feedbacksDoProfissional([item], profissionais, usuarios, email);
describe("Feedback recebido pelo Profissional", () => {
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