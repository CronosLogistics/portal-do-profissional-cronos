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

import { areaDoDepartamento, grupoGestaoOrganograma, ESTRUTURA } from "@/lib/organograma.rules";

describe("estrutura oficial do organograma", () => {
  it("TI e Tecnologia ficam na mesma caixa", () => {
    expect(areaDoDepartamento("TI", "ANALISTA")).toBe("Tecnologia");
    expect(areaDoDepartamento("TECNOLOGIA", "ANALISTA")).toBe("Tecnologia");
  });
  it("Caxias fica no grupo Comercial RS e Caxias do Sul, sob o CEO", () => {
    expect(areaDoDepartamento("ADMINISTRATIVO ESCRITÓRIO CAXIAS DO SUL", "ASSISTENTE")).toBe("Adm. Caxias do Sul");
    const ceo = ESTRUTURA.find((e) => e.id === "Diretoria CEO");
    expect(ceo?.filhos?.find((f) => f.id === "Comercial RS e Caxias do Sul")?.filhos?.map((f) => f.id)).toContain("Adm. Caxias do Sul");
  });
  it("TLD e Comercial Nordeste respondem ao COO", () => {
    const coo = ESTRUTURA.find((e) => e.id === "Diretoria COO")?.filhos?.map((f) => f.id);
    expect(coo).toEqual(expect.arrayContaining(["TLD", "Comercial Nordeste", "Qualidade", "Operação", "Pricing"]));
  });
  it("Operação Multimodal fica no grupo Operação e diretores na Diretoria", () => {
    expect(areaDoDepartamento(" OPERAÇÃO MULTIMODAL ", "GERENTE")).toBe("Operação");
    expect(areaDoDepartamento(null, "DIRETOR COO")).toBe("Diretoria");
  });
  it("Camila lidera o grupo acima de Comercial SC e ES sem mudar seu departamento", () => {
    const area = areaDoDepartamento("COMERCIAL SC", "COORDENADOR COMERCIAL");
    expect(area).toBe("Comercial SC");
    const camila = { nome: "Camila Topanotti - Cronos Logistics", area, nivel: "Coordenação" as const };
    expect(grupoGestaoOrganograma(camila)).toBe("Comercial SC e ES");
    expect(camila.area).toBe("Comercial SC");
    expect(grupoGestaoOrganograma({ nome: "CAMILA FARIAS TOPANOTTI", area, nivel: "Coordenação" })).toBe("Comercial SC e ES");
    const grupo = ESTRUTURA.find((e) => e.id === "Diretoria CEO")?.filhos?.find((f) => f.id === "Comercial SC e ES");
    expect(grupo?.filhos?.map((f) => f.id)).toEqual(["Comercial SC", "Comercial ES"]);
  });
  it("mantém Aline e a equipe em suas caixas e não move Camila de outra área", () => {
    expect(grupoGestaoOrganograma({ nome: "Aline Senger - Cronos Logistics", area: "Comercial ES", nivel: "Supervisão" })).toBeNull();
    expect(grupoGestaoOrganograma({ nome: "Carla Bello", area: "Comercial SC", nivel: "Analista/consultor" })).toBeNull();
    expect(grupoGestaoOrganograma({ nome: "Camila Topanotti", area: "Marketing", nivel: "Coordenação" })).toBeNull();
  });
  it("Ana Bueno lidera Comercial RS e Adm. Caxias do Sul sem mudar seu departamento", () => {
    const area = areaDoDepartamento("COMERCIAL RS", "COORDENADOR COMERCIAL");
    expect(area).toBe("Comercial RS");
    const ana = { nome: "Ana Bueno - Cronos Logistics", area, nivel: "Coordenação" as const };
    expect(grupoGestaoOrganograma(ana)).toBe("Comercial RS e Caxias do Sul");
    expect(ana.area).toBe("Comercial RS");
    expect(grupoGestaoOrganograma({ nome: "ANA JULIA BUENO", area, nivel: "Coordenação" })).toBe("Comercial RS e Caxias do Sul");
    expect(grupoGestaoOrganograma({ nome: "Ana Bueno", area: "Adm. Caxias do Sul", nivel: "Coordenação" })).toBe("Comercial RS e Caxias do Sul");
    const grupo = ESTRUTURA.find((e) => e.id === "Diretoria CEO")?.filhos?.find((f) => f.id === "Comercial RS e Caxias do Sul");
    expect(grupo?.filhos?.map((f) => f.id)).toEqual(["Comercial RS", "Adm. Caxias do Sul"]);
  });
  it("mantém a equipe de RS e Caxias em suas caixas e não move Ana de outra área", () => {
    expect(grupoGestaoOrganograma({ nome: "Alexey Kurunczi", area: "Comercial RS", nivel: "Analista/consultor" })).toBeNull();
    expect(grupoGestaoOrganograma({ nome: "Rayssa Sousa", area: "Adm. Caxias do Sul", nivel: "Assistente" })).toBeNull();
    expect(grupoGestaoOrganograma({ nome: "Ana Bueno", area: "Marketing", nivel: "Coordenação" })).toBeNull();
    expect(grupoGestaoOrganograma({ nome: "Ana Beatriz", area: "Comercial RS", nivel: "Analista/consultor" })).toBeNull();
  });
  it("Vanessa indica a gestão da Operação e mantém seu cartão na área operacional", () => {
    const vanessa = { nome: "Vanessa Heyse - Cronos Logistics", area: areaDoDepartamento("OPERAÇÃO MULTIMODAL", "GERENTE OPERACIONAL"), nivel: "Gerência" as const };
    expect(grupoGestaoOrganograma(vanessa)).toBe("Operação");
    expect(vanessa.area).toBe("Operação");
  });
  it("Gabrielle indica a gestão administrativa e de pessoas sem mudar sua área", () => {
    const gabrielle = { nome: "Gabrielle Rossato - Cronos Logistics", area: areaDoDepartamento("ADMINISTRATIVO E GESTÃO DE PESSOAS", "COORDENADORA ADMINISTRATIVA E GESTÃO DE PESSOAS"), nivel: "Coordenação" as const };
    expect(grupoGestaoOrganograma(gabrielle)).toBe("Administrativo e Gestão de Pessoas");
    expect(gabrielle.area).toBe("Administrativo e Gestão de Pessoas");
  });
  it("integrantes comuns de uma área agrupada não passam a gestores", () => {
    expect(grupoGestaoOrganograma({ nome: "Analista Operacional", area: "Operação", nivel: "Analista/consultor" })).toBeNull();
  });
});
