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

import { areaDoDepartamento, areaVisualOrganograma, ESTRUTURA } from "@/lib/organograma.rules";

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
  it("Camila lidera o grupo acima de Comercial SC e ES sem mudar seu departamento", () => {
    const area = areaDoDepartamento("COMERCIAL SC", "COORDENADOR COMERCIAL");
    expect(area).toBe("Comercial SC");
    expect(areaVisualOrganograma({ nome: "Camila Topanotti - Cronos Logistics", area })).toBe("Comercial SC e ES");
    expect(areaVisualOrganograma({ nome: "CAMILA FARIAS TOPANOTTI", area })).toBe("Comercial SC e ES");
    const grupo = ESTRUTURA.find((e) => e.id === "Diretoria CEO")?.filhos?.find((f) => f.id === "Comercial SC e ES");
    expect(grupo?.filhos?.map((f) => f.id)).toEqual(["Comercial SC", "Comercial ES"]);
  });
  it("mantém Aline e a equipe em suas caixas e não move Camila de outra área", () => {
    expect(areaVisualOrganograma({ nome: "Aline Senger - Cronos Logistics", area: "Comercial ES" })).toBe("Comercial ES");
    expect(areaVisualOrganograma({ nome: "Carla Bello", area: "Comercial SC" })).toBe("Comercial SC");
    expect(areaVisualOrganograma({ nome: "Camila Topanotti", area: "Marketing" })).toBe("Marketing");
  });
  it("Ana Bueno lidera Comercial RS e Adm. Caxias do Sul sem mudar seu departamento", () => {
    const area = areaDoDepartamento("COMERCIAL RS", "COORDENADOR COMERCIAL");
    expect(area).toBe("Comercial RS");
    expect(areaVisualOrganograma({ nome: "Ana Bueno - Cronos Logistics", area })).toBe("Comercial RS e Caxias do Sul");
    expect(areaVisualOrganograma({ nome: "ANA JULIA BUENO", area })).toBe("Comercial RS e Caxias do Sul");
    expect(areaVisualOrganograma({ nome: "Ana Bueno", area: "Adm. Caxias do Sul" })).toBe("Comercial RS e Caxias do Sul");
    const grupo = ESTRUTURA.find((e) => e.id === "Diretoria CEO")?.filhos?.find((f) => f.id === "Comercial RS e Caxias do Sul");
    expect(grupo?.filhos?.map((f) => f.id)).toEqual(["Comercial RS", "Adm. Caxias do Sul"]);
  });
  it("mantém a equipe de RS e Caxias em suas caixas e não move Ana de outra área", () => {
    expect(areaVisualOrganograma({ nome: "Alexey Kurunczi", area: "Comercial RS" })).toBe("Comercial RS");
    expect(areaVisualOrganograma({ nome: "Rayssa Sousa", area: "Adm. Caxias do Sul" })).toBe("Adm. Caxias do Sul");
    expect(areaVisualOrganograma({ nome: "Ana Bueno", area: "Marketing" })).toBe("Marketing");
    expect(areaVisualOrganograma({ nome: "Ana Beatriz", area: "Comercial RS" })).toBe("Comercial RS");
  });
});
