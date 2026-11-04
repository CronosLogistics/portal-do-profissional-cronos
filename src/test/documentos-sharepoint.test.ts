import { describe, expect, it } from "vitest";
import { filtrarDocumentos, projetarDocumento } from "../lib/documentos-sharepoint.rules";

const arquivo = { id: "1", name: "Procedimento.pdf", webUrl: "https://cronoslogisticscombr.sharepoint.com/sites/CronosLogistics-Principal/Qualidade/Procedimento.pdf", file: { mimeType: "application/pdf" } };
describe("Documentos do SharePoint", () => {
  it("projeta arquivos com seu link original e pasta", () => {
    expect(projetarDocumento(arquivo, "Qualidade", "Procedimentos")).toEqual({ id: "1", titulo: "Procedimento.pdf", url: arquivo.webUrl, categoria: "Qualidade", pasta: "Procedimentos" });
  });
  it("não transforma pastas em documentos", () => {
    expect(projetarDocumento({ id: arquivo.id, name: arquivo.name, webUrl: arquivo.webUrl, folder: { childCount: 3 } }, "Qualidade", "")).toBeNull();
  });
  it("não retorna links fora do SharePoint corporativo", () => {
    expect(projetarDocumento({ ...arquivo, webUrl: "https://example.com/a.pdf" }, "Qualidade", "")).toBeNull();
  });
  it("busca nomes e pastas e filtra a categoria", () => {
    const itens = [{ id: "1", titulo: "Padrão.docx", url: arquivo.webUrl, categoria: "Modelo Documental", pasta: "Instrução" }, { id: "2", titulo: "Padrão.pdf", url: arquivo.webUrl, categoria: "Qualidade", pasta: "" }];
    expect(filtrarDocumentos(itens, "instrucao").map(i => i.id)).toEqual(["1"]);
    expect(filtrarDocumentos(itens, "padrao", "Qualidade").map(i => i.id)).toEqual(["2"]);
  });
});