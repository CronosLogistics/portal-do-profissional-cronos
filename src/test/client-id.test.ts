import { webcrypto } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { criarIdCliente } from "../lib/client-id";

afterEach(() => vi.unstubAllGlobals());

describe("identificadores do navegador", () => {
  it("gera UUIDs distintos e válidos sem crypto.randomUUID", () => {
    vi.stubGlobal("crypto", { getRandomValues: webcrypto.getRandomValues.bind(webcrypto) });
    const primeiro = criarIdCliente();
    const segundo = criarIdCliente();
    expect(primeiro).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(segundo).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(segundo).not.toBe(primeiro);
  });
});