import { describe, expect, it } from "vitest";
import { liderImediato } from "@/lib/organograma.rules";

describe("liderImediato", () => {
  it("analista fica sob o supervisor, não o coordenador", () => {
    expect(liderImediato({ nivel: "Analista/consultor", area: "Tecnologia" }, [
      { id: "coord", nivel: "Coordenação", area: "Tecnologia" },
      { id: "natan", nivel: "Supervisão", area: "Tecnologia" },
    ])).toBe("natan");
  });
  it("supervisor fica sob o coordenador", () => {
    expect(liderImediato({ nivel: "Supervisão", area: "Comercial SP" }, [{ id: "c", nivel: "Coordenação", area: "Comercial SP" }])).toBe("c");
  });
  it("ignora líder de outra área ou de mesmo nível", () => {
    expect(liderImediato({ nivel: "Supervisão", area: "Comercial" }, [
      { id: "x", nivel: "Coordenação", area: "Operação" },
      { id: "y", nivel: "Supervisão", area: "Comercial" },
    ])).toBeNull();
  });
});

import { areaDoDepartamento, ESTRUTURA } from "@/lib/organograma.rules";

describe("estrutura oficial do organograma", () => {
  it("TI e Tecnologia ficam na mesma caixa", () => {
    expect(areaDoDepartamento("TI", "ANALISTA")).toBe("Tecnologia");
    expect(areaDoDepartamento("TECNOLOGIA", "ANALISTA")).toBe("Tecnologia");
  });
  it("Caxias fica no grupo Comercial RS e Caxias do Sul, sob o CEO", () => {
    expect(areaDoDepartamento("ADMINISTRATIVO ESCRITÓRIO CAXIAS DO SUL", "ASSISTENTE")).toBe("Adm. Caxias do Sul");
    const ceo = ESTRUTURA.find((e) => e.id === "Diretoria CEO")!;
    expect(ceo.filhos!.find((f) => f.id === "Comercial RS e Caxias do Sul")!.filhos!.map((f) => f.id)).toContain("Adm. Caxias do Sul");
  });
  it("TLD e Comercial Nordeste respondem ao COO", () => {
    const coo = ESTRUTURA.find((e) => e.id === "Diretoria COO")!.filhos!.map((f) => f.id);
    expect(coo).toEqual(expect.arrayContaining(["TLD", "Comercial Nordeste", "Qualidade", "Operação", "Pricing"]));
  });
  it("Operação Multimodal fica no grupo Operação e diretores na Diretoria", () => {
    expect(areaDoDepartamento(" OPERAÇÃO MULTIMODAL ", "GERENTE")).toBe("Operação");
    expect(areaDoDepartamento(null, "DIRETOR COO")).toBe("Diretoria");
  });
});
