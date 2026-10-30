import { describe, expect, it } from "vitest";
import { filtrarFormularios, type Formulario } from "@/lib/formularios";
const forms: Formulario[] = [{ id: "1", setor: "Qualidade", titulo: "Não conformidade", codigo: "RQ-00-02", acao: "Abrir", url: "https://forms.office.com/r/exemplo", ordem: 1 }, { id: "2", setor: "TI", titulo: "Ticket", acao: "Abrir", url: "https://forms.office.com/r/ticket", ordem: 2 }];
describe("formulários", () => {
  it("busca sem acento", () => expect(filtrarFormularios(forms, "nao conformidade")[0]?.codigo).toBe("RQ-00-02"));
  it("filtra por setor", () => expect(filtrarFormularios(forms, "", "Qualidade").map(f => f.id)).toEqual(["1"]));
});
