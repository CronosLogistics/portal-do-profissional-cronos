import { describe, expect, it } from "vitest";
import { areaDoDepartamento, areaFinal, nivelDoCargo } from "@/lib/organograma.rules";

describe("organograma", () => {
  it("CEO fica na Diretoria", () => expect(areaDoDepartamento("Comercial", "CEO")).toBe("Diretoria"));
  it("Gestão de Pessoas é reconhecida", () => expect(areaDoDepartamento("GESTÃO DE PESSOAS", "Analista")).toBe("Gestão de Pessoas"));
  it("Importação aérea vai para Operação", () => expect(areaDoDepartamento("IMPORTAÇÃO AÉREA", "Analista")).toBe("Operação"));
  it("ajuste salvo prevalece", () => expect(areaFinal("Marketing", "Comercial SP", "Analista")).toBe("Marketing"));
  it("ajuste inválido é ignorado", () => expect(areaFinal("X", "Pricing", "Analista")).toBe("Pricing"));
  it("coordenador vira Coordenação", () => expect(nivelDoCargo("Coordenadora Comercial")).toBe("Coordenação"));
});
