import { computePatch, entraEmail, matchEntraUser, type EntraUser, type ProfileRow } from "@/lib/entra-sync.rules";

const GATEWAY_URL = "https://connector-gateway.lovable.dev";

async function fetchAllEntraUsers(): Promise<EntraUser[]> {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const graphKey = process.env["AZURE_GRAPH_API_KEY"];
  if (!lovableKey || !graphKey) throw new Error("Conexão com o Microsoft não configurada.");
  const headers = { Authorization: `Bearer ${lovableKey}`, "X-Connection-Api-Key": graphKey };
  let url: string | null =
    `${GATEWAY_URL}/azure_graph/v1.0/users?$select=id,displayName,mail,userPrincipalName,accountEnabled,employeeId&$top=999`;
  const all: EntraUser[] = [];
  for (let page = 0; url && page < 100; page++) {
    const res: Response = await fetch(url, { headers });
    if (res.status === 403) {
      throw new Error("Sem permissão para ler os usuários do Microsoft (a TI precisa liberar User.Read.All de aplicativo).");
    }
    if (!res.ok) throw new Error(`Falha ao consultar o Microsoft [${res.status}]: ${(await res.text()).slice(0, 300)}`);
    const body = (await res.json()) as { value: EntraUser[]; "@odata.nextLink"?: string };
    all.push(...body.value);
    const next = body["@odata.nextLink"];
    if (next) {
      const u = new URL(next);
      if (u.hostname !== "graph.microsoft.com") throw new Error("Paginação inesperada do Microsoft.");
      url = `${GATEWAY_URL}/azure_graph${u.pathname}${u.search}`;
    } else url = null;
  }
  return all;
}

export type SyncOrigin = "automatica" | "manual";

/** Sincroniza os cadastros do portal com o diretório Microsoft e registra o resultado. */
export async function runEntraSync(opts: { origem: SyncOrigin; disparadoPor?: string | null } = { origem: "automatica" }) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const lock = await supabaseAdmin.rpc("reservar_sincronizacao");
  if (lock.error) throw new Error("Não foi possível iniciar a sincronização.");
  if (lock.data !== true) {
    return { sucesso: false, alterados: 0, erro: "Sincronização em andamento. Aguarde alguns minutos.", emAndamento: true };
  }
  const meta = { origem: opts.origem, disparado_por: opts.disparadoPor ?? null, em_execucao_desde: null };
  const r = await doSync(supabaseAdmin, meta);
  return { ...r, emAndamento: false };
}

async function doSync(
  supabaseAdmin: Awaited<typeof import("@/integrations/supabase/client.server")>["supabaseAdmin"],
  meta: { origem: SyncOrigin; disparado_por: string | null; em_execucao_desde: null },
) {
  const now = new Date().toISOString();
  let alterados = 0;
  try {
    const users = await fetchAllEntraUsers();
    const byOid = new Map(users.map((u) => [u.id, u]));
    const byEmail = new Map(users.map((u) => [entraEmail(u), u]));
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("id, email, full_name, employee_id, is_active, entra_oid");
    if (error) throw new Error("Não foi possível ler os cadastros do portal.");
    for (const p of (data ?? []) as ProfileRow[]) {
      const patch = computePatch(p, matchEntraUser(p, byOid, byEmail));
      const up = await supabaseAdmin
        .from("profiles")
        .update({ ...(patch ?? {}), sincronizado_em: now })
        .eq("id", p.id);
      if (up.error) continue;
      if (patch) {
        alterados++;
        if (patch.is_active !== p.is_active) {
          await supabaseAdmin.auth.admin.updateUserById(p.id, { ban_duration: patch.is_active ? "none" : "876000h" });
        }
      }
    }
    await supabaseAdmin.from("status_sincronizacao").upsert({ id: true, executado_em: now, sucesso: true, erro: null, alterados, ...meta });
    return { sucesso: true, alterados, erro: null as string | null };
  } catch (e) {
    const erro = e instanceof Error ? e.message : "Erro desconhecido.";
    await supabaseAdmin.from("status_sincronizacao").upsert({ id: true, executado_em: now, sucesso: false, erro, alterados, ...meta });
    return { sucesso: false, alterados, erro };
  }
}
