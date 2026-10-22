import { createClient } from "@supabase/supabase-js";

/**
 * Base do Espaço do Profissional (site antigo), lida em modo somente leitura
 * com a mesma chave pública que o site já usa. A GP continua editando lá.
 */
const LEGACY_URL = "https://sdhvxzsnlirembqrknxo.supabase.co";
const LEGACY_PUBLISHABLE_KEY = "sb_publishable_b6DMihCss_WDnS7eOa7oug_2asDCIu7";
/** Origem pública do site antigo, que serve logos, imagens e anexos. */
export const LEGACY_SITE_ORIGIN = "https://espacodoprofissionalcronos.lovable.app";

export function legacyClient() {
  return createClient(LEGACY_URL, LEGACY_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Converte endereços relativos do site antigo (/api/public/...) em absolutos. */
export function legacyUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith("/")) return `${LEGACY_SITE_ORIGIN}${url}`;
  return url;
}

export function legacyFileUrl(path: string, name?: string) {
  const q = `path=${encodeURIComponent(path)}${name ? `&name=${encodeURIComponent(name)}` : ""}`;
  return `${LEGACY_SITE_ORIGIN}/api/public/partner-logo?${q}`;
}
