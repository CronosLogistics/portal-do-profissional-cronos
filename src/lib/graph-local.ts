/**
 * Dev-local fallback for Microsoft Graph. Installed server-side only.
 * When the Lovable connector keys are absent but AZURE_TENANT_ID/CLIENT_ID/CLIENT_SECRET
 * exist (e.g. running in Cursor), gateway URLs are rewritten to graph.microsoft.com
 * using a client-credentials token. In Lovable (keys present) nothing changes.
 */
const GATEWAY = "https://connector-gateway.lovable.dev/";
let instalado = false;
let token: { valor: string; expira: number } | null = null;

async function obterToken(fetchOriginal: typeof fetch): Promise<string> {
  if (token && Date.now() < token.expira - 60_000) return token.valor;
  const tenant = process.env["AZURE_TENANT_ID"]!;
  const body = new URLSearchParams({
    client_id: process.env["AZURE_CLIENT_ID"]!,
    client_secret: process.env["AZURE_CLIENT_SECRET"]!,
    scope: "https://graph.microsoft.com/.default",
    grant_type: "client_credentials",
  });
  const res = await fetchOriginal(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, { method: "POST", body });
  if (!res.ok) throw new Error(`Falha ao obter token Microsoft local [${res.status}]: ${await res.text()}`);
  const json = (await res.json()) as { access_token: string; expires_in: number };
  token = { valor: json.access_token, expira: Date.now() + json.expires_in * 1000 };
  return token.valor;
}

export function reescreverUrlGraph(url: string): string | null {
  if (url.startsWith(`${GATEWAY}azure_graph/`)) return `https://graph.microsoft.com/${url.slice(GATEWAY.length + "azure_graph/".length)}`;
  if (url.startsWith(`${GATEWAY}microsoft_sharepoint/`)) return `https://graph.microsoft.com/v1.0/${url.slice(GATEWAY.length + "microsoft_sharepoint/".length)}`;
  return null;
}

export function instalarGraphLocal() {
  if (instalado) return;
  instalado = true;
  if (typeof process === "undefined" || process.env["LOVABLE_API_KEY"]) return;
  if (!process.env["AZURE_TENANT_ID"] || !process.env["AZURE_CLIENT_ID"] || !process.env["AZURE_CLIENT_SECRET"]) return;
  for (const k of ["LOVABLE_API_KEY", "AZURE_GRAPH_API_KEY", "MICROSOFT_SHAREPOINT_API_KEY"]) process.env[k] ??= "local";
  const original = globalThis.fetch.bind(globalThis);
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const destino = reescreverUrlGraph(url);
    if (!destino) return original(input, init);
    const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
    headers.delete("X-Connection-Api-Key");
    headers.set("Authorization", `Bearer ${await obterToken(original)}`);
    return original(destino, { ...init, headers });
  }) as typeof fetch;
  console.info("[graph-local] Usando Microsoft Graph direto com AZURE_* do .env");
}
