import { computePatch, entraEmail, matchEntraUser, novosAdmitidos, MAX_ADMISSOES_POR_SYNC, type EntraUser, type ProfileRow } from "@/lib/entra-sync.rules";

const GATEWAY_URL = "https://connector-gateway.lovable.dev";

async function fetchAllEntraUsers(): Promise<EntraUser[]> {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const graphKey = process.env["AZURE_GRAPH_API_KEY"];
  if (!lovableKey || !graphKey) throw new Error("Conexão com o Microsoft não configurada.");
  const headers = { Authorization: `Bearer ${lovableKey}`, "X-Connection-Api-Key": graphKey };
  let url: string | null =
    `${GATEWAY_URL}/azure_graph/v1.0/users?$select=id,displayName,mail,userPrincipalName,accountEnabled,employeeId,userType&$top=999`;
  const all: EntraUser[] = [];
  for (let page = 0; url && page < 100; page++) {
    const res: Response = await fetch(url, { headers, signal: AbortSignal.timeout(20000) });
    if (res.status === 403) {
      throw new Error("Sem permissão para ler os usuários do Microsoft (a TI precisa liberar User.Read.All de aplicativo).");
    }
    if (!res.ok) throw new Error(`Falha ao consultar o Microsoft [${res.status}]: ${(await res.text()).slice(0, 300)}`);
    const body = (await res.json()) as { value: EntraUser[]; "@odata.nextLink"?: string };
    if (!Array.isArray(body.value)) throw new Error("Consulta de usuários Microsoft inválida; cadastros preservados.");
    all.push(...body.value);
    const next = body["@odata.nextLink"];
    if (next) {
      const u = new URL(next);
      if (u.hostname !== "graph.microsoft.com" || u.pathname !== "/v1.0/users") throw new Error("Paginação inesperada do Microsoft.");
      url = `${GATEWAY_URL}/azure_graph${u.pathname}${u.search}`;
    } else url = null;
  }
  if (url || !all.length) throw new Error("Consulta Microsoft incompleta ou vazia; cadastros preservados.");
  return all;
}

export type SyncOrigin = "automatica" | "manual";

/** Sincroniza os cadastros do portal com o diretório Microsoft e registra o resultado. */
export async function runEntraSync(opts: { origem: SyncOrigin; disparadoPor?: string | null } = { origem: "automatica" }) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const lock = await supabaseAdmin.rpc("reservar_sincronizacao");
  if (lock.error) throw new Error("Não foi possível iniciar a sincronização.");
  if (lock.data !== true) {
    return { sucesso: false, alterados: 0, incluidos: 0, pendentes: 0, erro: "Sincronização em andamento. Aguarde alguns minutos.", emAndamento: true };
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
  let incluidos = 0;
  let pendentes = 0;
  try {
    // Read both sources completely before any write, including a fresh HR snapshot.
    const { cadastrosAtivos } = await import("./perfil.server");
    const [users, ativos] = await Promise.all([fetchAllEntraUsers(), cadastrosAtivos(true)]);
    const byOid = new Map(users.map((u) => [u.id, u]));
    const byEmail = new Map(users.map((u) => [entraEmail(u), u]));
    const profiles: ProfileRow[] = [];
    for (let page = 0; page < 100; page++) {
      const { data, error } = await supabaseAdmin.from("profiles")
        .select("id, email, full_name, employee_id, is_active, entra_oid")
        .order("id").range(page * 1000, (page + 1) * 1000 - 1);
      if (error) throw new Error("Não foi possível ler os cadastros do portal.");
      profiles.push(...(data ?? []));
      if ((data?.length ?? 0) < 1000) break;
      if (page === 99) throw new Error("Consulta dos cadastros incompleta; sincronização interrompida.");
    }
    const novos = novosAdmitidos(users, profiles, new Set(ativos.keys()));
    pendentes = Math.max(0, novos.length - MAX_ADMISSOES_POR_SYNC);
    for (const p of profiles) {
      const patch = computePatch(p, matchEntraUser(p, byOid, byEmail));
      if (patch && patch.is_active !== p.is_active) {
        const ban = await supabaseAdmin.auth.admin.updateUserById(p.id, { ban_duration: patch.is_active ? "none" : "876000h" });
        if (ban.error) throw new Error("Não foi possível atualizar o bloqueio de uma conta; sincronização interrompida.");
      }
      const up = await supabaseAdmin
        .from("profiles")
        .update({ ...(patch ?? {}), sincronizado_em: now })
        .eq("id", p.id);
      if (up.error) throw new Error("Não foi possível atualizar um profissional; sincronização interrompida.");
      if (patch) alterados++;
    }
    const { provisionarAdmitido } = await import("./entra-admissions.server");
    for (const user of novos.slice(0, MAX_ADMISSOES_POR_SYNC)) {
      await provisionarAdmitido(supabaseAdmin, user, now);
      incluidos++;
      alterados++;
    }
    const { sincronizarDepartamentos } = await import("./departamentos.server");
    await sincronizarDepartamentos(true);
    await supabaseAdmin.from("status_sincronizacao").upsert({ id: true, executado_em: now, sucesso: true, erro: null, alterados, ...meta });
    return { sucesso: true, alterados, incluidos, pendentes, erro: null as string | null };
  } catch (e) {
    const erro = e instanceof Error ? e.message : "Erro desconhecido.";
    await supabaseAdmin.from("status_sincronizacao").upsert({ id: true, executado_em: now, sucesso: false, erro, alterados, ...meta });
    return { sucesso: false, alterados, incluidos, pendentes, erro };
  }
}
