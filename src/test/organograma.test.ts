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
    expect(liderImediato({ nivel: "Supervisão", area: "Comercial" }, [{ id: "c", nivel: "Coordenação", area: "Comercial" }])).toBe("c");
  });
  it("ignora líder de outra área ou de mesmo nível", () => {
    expect(liderImediato({ nivel: "Supervisão", area: "Comercial" }, [
      { id: "x", nivel: "Coordenação", area: "Operação" },
      { id: "y", nivel: "Supervisão", area: "Comercial" },
    ])).toBeNull();
  });
});
