import { montarConteudoInsider, nomeMes, type ProfissionalInsider } from "./insider.rules";

const SITE = "cronoslogisticscombr.sharepoint.com,dc6d3de3-d3ee-4d0d-b0ba-b86afc2f715c,6caaae7c-2a4d-4322-82a8-354fe45cfde2";
const LISTA = "0e37d734-d94f-4832-9802-d3c2e7daf395";
const GATEWAY = "https://connector-gateway.lovable.dev/azure_graph";

export async function lerProfissionaisInsider(): Promise<ProfissionalInsider[]> {
  const key = process.env["LOVABLE_API_KEY"], graph = process.env["AZURE_GRAPH_API_KEY"];
  if (!key || !graph) throw new Error("A conexão Microsoft não está configurada.");
  let url: string | null = `${GATEWAY}/v1.0/sites/${SITE}/lists/${LISTA}/items?$select=id&$expand=fields($select=Title,field_1,field_4,DATADENASC_x002e_,DEPARTAMENTOATUAL,field_3)&$top=500`;
  const itens: ProfissionalInsider[] = [];
  for (let pagina = 0; url && pagina < 20; pagina++) {
    const res: Response = await fetch(url, { headers: { Authorization: `Bearer ${key}`, "X-Connection-Api-Key": graph }, signal: AbortSignal.timeout(20000) });
    if (!res.ok) {
      const body = await res.text();
      console.error(`Microsoft Insider [${res.status}]: ${body.slice(0, 500)}`);
      throw new Error(`Microsoft [${res.status}]: ${res.status === 403 ? "Sem permissão para ler Profissionais Brasil." : "Não foi possível consultar Profissionais Brasil. Tente novamente mais tarde."}`);
    }
    const data = await res.json() as { value: ProfissionalInsider[]; "@odata.nextLink"?: string };
    if (!Array.isArray(data.value)) throw new Error("A lista Microsoft retornou um formato inesperado.");
    itens.push(...data.value);
    if (data["@odata.nextLink"]) {
      const next = new URL(data["@odata.nextLink"]);
      if (next.hostname !== "graph.microsoft.com" || !next.pathname.startsWith(`/v1.0/sites/${SITE}/lists/${LISTA}/items`)) throw new Error("Paginação inesperada do Microsoft.");
      url = `${GATEWAY}${next.pathname}${next.search}`;
    } else url = null;
  }
  if (url) throw new Error("A leitura da lista ficou incompleta. Nenhuma edição foi preparada.");
  return itens;
}

export async function prepararInsider(mes: string, origem: "manual" | "automatica") {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const existente = await supabaseAdmin.from("insider_edicoes").select("id").eq("mes_ano", mes).maybeSingle();
  if (existente.error) throw new Error(existente.error.message);
  if (existente.data) return existente.data.id;
  const token = crypto.randomUUID();
  const reserva = await supabaseAdmin.rpc("reservar_insider", { _mes: mes, _token: token });
  if (reserva.error) throw new Error(reserva.error.message);
  if (!reserva.data) throw new Error("Esta edição já está sendo preparada. Aguarde e atualize a lista.");
  try {
    const conteudo = montarConteudoInsider(await lerProfissionaisInsider(), mes);
    const inserido = await supabaseAdmin.from("insider_edicoes").insert({ mes_ano: mes, titulo: `Cronos Insider - ${nomeMes(mes)}`, conteudo, origem }).select("id").single();
    if (inserido.error) throw new Error(inserido.error.message);
    await supabaseAdmin.from("insider_preparacoes").update({ em_execucao_desde: null, concluido_em: new Date().toISOString(), erro: null }).eq("mes_ano", mes).eq("token", token);
    return inserido.data.id;
  } catch (error) {
    await supabaseAdmin.from("insider_preparacoes").update({ em_execucao_desde: null, erro: error instanceof Error ? error.message : "Falha ao preparar edição." }).eq("mes_ano", mes).eq("token", token);
    throw error;
  }
}