import { describe, expect, it } from "vitest";
import { erroTamanhoImagemMural } from "@/lib/mural-imagem";

const MB = 1024 * 1024;

describe("limite de imagem do mural", () => {
  it("aceita imagem de exatamente 18 MB", () => {
    expect(erroTamanhoImagemMural({ size: 18 * MB })).toBeNull();
  });
  it("recusa imagem acima de 18 MB informando o tamanho", () => {
    expect(erroTamanhoImagemMural({ size: 18 * MB + 1 })).toContain("limite de 18 MB");
    expect(erroTamanhoImagemMural({ size: 20 * MB })).toContain("20,0 MB");
  });
});
