/** Chave pública (de navegador) do Giphy; buscas são feitas direto do browser. */
const GIPHY_KEY = "2qVOu4I4A1qR2nbH5tTWACYUVBYemK2Z";

export type GifResultado = { id: string; titulo: string; preview: string; url: string };

/** Mesma regra do banco (gif_permitido): só imagens https dos servidores do Giphy. */
export function gifPermitido(url: string | null | undefined): url is string {
  return typeof url === "string" && url.length <= 500 && /^https:\/\/(media[0-9]*|i)\.giphy\.com\/[A-Za-z0-9_./-]+$/.test(url);
}

type Bruto = { id: string; title?: string; images?: Record<string, { url?: string } | undefined> };

export async function buscarGifs(termo: string): Promise<GifResultado[]> {
  const q = termo.trim();
  const base = q ? "https://api.giphy.com/v1/gifs/search" : "https://api.giphy.com/v1/gifs/trending";
  const params = new URLSearchParams({ api_key: GIPHY_KEY, limit: "24", rating: "g", lang: "pt" });
  if (q) params.set("q", q);
  const r = await fetch(`${base}?${params}`);
  if (!r.ok) throw new Error(r.status === 429 ? "Limite de buscas de GIF atingido. Tente em alguns minutos." : "Não foi possível carregar os GIFs.");
  const json = (await r.json()) as { data?: Bruto[] };
  return (json.data ?? []).flatMap((g) => {
    const img = (k: string) => g.images?.[k]?.url;
    const url = (img("downsized_medium") ?? img("original") ?? "").split("?")[0] ?? "";
    const preview = (img("fixed_width_small") ?? img("fixed_width") ?? url).split("?")[0] ?? url;
    return gifPermitido(url) ? [{ id: g.id, titulo: g.title || "GIF", preview, url }] : [];
  });
}
