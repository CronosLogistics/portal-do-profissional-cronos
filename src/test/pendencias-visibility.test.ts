import { describe, expect, it } from "vitest";
import { temPendencias } from "../lib/pendencias-visibility";

describe("Categorias visíveis nas pendências", () => {
  it("oculta categoria com zero pendências", () => {
    expect(temPendencias(0)).toBe(false);
    expect(temPendencias(1)).toBe(true);
  });
  it("oculta grupo quando todas as categorias estão em zero", () => {
    expect(temPendencias(0, 0, 0)).toBe(false);
    expect(temPendencias(0, 2, 0)).toBe(true);
  });
});