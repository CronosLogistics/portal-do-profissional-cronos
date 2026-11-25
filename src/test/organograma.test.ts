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

import { areaDoDepartamento, areasVisuaisOrganograma, grupoGestaoOrganograma, ESTRUTURA, ESTRUTURA_VISUAL, AREAS, type NoOrganograma } from "@/lib/organograma.rules";

describe("reporte conjunto no organograma visual", () => {
  const ids = (nos: NoOrganograma[]): string[] => nos.flatMap((n) => [n.id, ...ids(n.filhos ?? [])]);
  const ramosIndividuais = ids(ESTRUTURA_VISUAL.executivos);

  it.each(["Gestão de Pessoas", "Qualidade", "Tecnologia"])("%s responde diretamente à Diretoria, não a um diretor individual", (setor) => {
    expect(ESTRUTURA_VISUAL.compartilhados.map((n) => n.id)).toContain(setor);
    expect(ramosIndividuais).not.toContain(setor);
    expect(AREAS).toContain(setor);
    expect(areaDoDepartamento(setor, "ANALISTA")).toBe(setor);
  });

  it("remove o grupo conjunto e mantém Administrativo diretamente sob o COO", () => {
    const coo = ESTRUTURA_VISUAL.executivos.find((n) => n.id === "Diretoria COO");
    expect(coo?.filhos?.find((n) => n.id === "Administrativo")?.tipo).toBe("dep");
    expect(ramosIndividuais).not.toContain("Administrativo e Gestão de Pessoas");
    expect(coo?.filhos?.map((n) => n.id)).toEqual(expect.arrayContaining(["Financeiro", "Controladoria", "Operação", "Pricing", "TLD", "Comercial Nordeste"]));
    expect(ESTRUTURA_VISUAL.executivos.find((n) => n.id === "Diretoria CEO")).toEqual(ESTRUTURA.find((n) => n.id === "Diretoria CEO"));
    const todos = ids([...ESTRUTURA_VISUAL.compartilhados, ...ESTRUTURA_VISUAL.executivos]);
    expect(todos.length).toBe(new Set(todos).size);
    expect([...todos].sort()).toEqual(ids(ESTRUTURA).filter((id) => id !== "Administrativo e Gestão de Pessoas").sort());
  });
});

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
  it("repete Gabrielle como coordenadora em Administrativo e Gestão de Pessoas sem mudar o cadastro", () => {
    const gabrielle = { nome: "Gabrielle Rossato - Cronos Logistics", area: areaDoDepartamento("ADMINISTRATIVO E GESTÃO DE PESSOAS", "COORDENADORA ADMINISTRATIVA E GESTÃO DE PESSOAS"), nivel: "Coordenação" as const };
    expect(areasVisuaisOrganograma(gabrielle)).toEqual(["Administrativo", "Gestão de Pessoas"]);
    expect(grupoGestaoOrganograma(gabrielle)).toBeNull();
    expect(gabrielle.area).toBe("Administrativo e Gestão de Pessoas");
  });
  it.each(["Administrativo", "Gestão de Pessoas"])("mantém Gabrielle responsável pelas duas áreas quando cadastrada em %s", (area) => {
    expect(areasVisuaisOrganograma({ nome: "GABRIELLE ROSSATO", area, nivel: "Coordenação" })).toEqual(["Administrativo", "Gestão de Pessoas"]);
  });
  it("não duplica colegas nem move Gabrielle de um setor não relacionado", () => {
    expect(areasVisuaisOrganograma({ nome: "Bruna Hlatki", area: "Gestão de Pessoas", nivel: "Supervisão" })).toEqual(["Gestão de Pessoas"]);
    expect(areasVisuaisOrganograma({ nome: "Gabrielle Rossato", area: "Marketing", nivel: "Coordenação" })).toEqual(["Marketing"]);
    expect(areasVisuaisOrganograma({ nome: "Gabrielle Rossato", area: "Administrativo", nivel: "Analista/consultor" })).toEqual(["Administrativo"]);
  });
  it.each(["Administrativo", "Gestão de Pessoas"])("a equipe de %s reconhece a cópia local da coordenadora", (area) => {
    const gabrielle = { id: "gabrielle", nome: "Gabrielle Rossato", area: "Administrativo e Gestão de Pessoas", nivel: "Coordenação" as const };
    const lideres = areasVisuaisOrganograma(gabrielle).map((areaVisual) => ({ ...gabrielle, area: areaVisual }));
    expect(liderImediato({ area, nivel: "Supervisão" }, lideres)).toBe("gabrielle");
  });
  it("integrantes comuns de uma área agrupada não passam a gestores", () => {
    expect(grupoGestaoOrganograma({ nome: "Analista Operacional", area: "Operação", nivel: "Analista/consultor" })).toBeNull();
  });
});
