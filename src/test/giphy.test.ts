import { describe, expect, it } from "vitest";
import { gifPermitido } from "@/lib/giphy";
import { limparTextoFormatado } from "@/lib/rich-text";

describe("GIFs do Giphy", () => {
  it("aceita apenas imagens https do Giphy", () => {
    expect(gifPermitido("https://media2.giphy.com/media/abc/giphy.gif")).toBe(true);
    expect(gifPermitido("https://evil.com/giphy.gif")).toBe(false);
    expect(gifPermitido("http://media.giphy.com/media/abc/giphy.gif")).toBe(false);
  });
  it("mantém GIF do Giphy no texto e remove outras imagens", () => {
    const html = limparTextoFormatado('<img src="https://media.giphy.com/media/a/giphy.gif" onerror="x"><img src="https://evil.com/a.gif">');
    expect(html).toBe('<img src="https://media.giphy.com/media/a/giphy.gif" />');
  });
});
