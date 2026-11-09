import sanitizeHtml from "sanitize-html";

export function limparTextoFormatado(html: string) {
  return sanitizeHtml(html, {
    allowedTags: ["p", "div", "br", "b", "strong", "i", "em", "u", "ul", "ol", "li", "a"],
    allowedAttributes: { a: ["href"] },
    allowedSchemes: ["https", "http", "mailto"],
    allowProtocolRelative: false,
  });
}

export function textoParaEditor(texto: string) {
  if (/<\/?(?:p|div|br|b|strong|i|em|u|ul|ol|li|a)(?:\s|>|\/)/i.test(texto)) return limparTextoFormatado(texto);
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