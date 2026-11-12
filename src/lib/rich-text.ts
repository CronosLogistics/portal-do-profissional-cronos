import sanitizeHtml from "sanitize-html";
import { gifPermitido } from "@/lib/giphy";

export function limparTextoFormatado(html: string) {
  return sanitizeHtml(html, {
    allowedTags: ["p", "div", "br", "b", "strong", "i", "em", "u", "ul", "ol", "li", "a", "img"],
    allowedAttributes: { a: ["href"], img: ["src", "alt"] },
    allowedSchemes: ["https", "http", "mailto"],
    allowedSchemesByTag: { img: ["https"] },
    allowProtocolRelative: false,
    // GIFs: only Giphy-hosted images, mirroring limpar_html_aviso in the database.
    exclusiveFilter: (frame) => frame.tag === "img" && !gifPermitido(frame.attribs["src"]),
  });
}

export function textoParaEditor(texto: string) {
  if (/<\/?(?:p|div|br|b|strong|i|em|u|ul|ol|li|a|img)(?:\s|>|\/)/i.test(texto)) return limparTextoFormatado(texto);
  return texto.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("\n", "<br>");
}

export function linkPermitido(url: string) {
  try { return ["https:", "http:", "mailto:"].includes(new URL(url.trim()).protocol); } catch { return false; }
}

/** Plain text for exports/SharePoint; strips allowlisted markup after sanitize. */
export function textoPlano(html: string) {
  return sanitizeHtml(limparTextoFormatado(html), { allowedTags: [], allowedAttributes: {} }).replace(/\s+/g, " ").trim();
}

export function htmlComConteudo(html: string) {
  return Boolean(textoPlano(html));
}