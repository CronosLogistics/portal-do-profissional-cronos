// @vitest-environment node
import { afterEach, expect, it, vi } from "vitest";
const fixture = vi.hoisted(() => ({
  q: {
    id: "form",
    titulo: "Pesquisa",
    anonimo: true,
    perguntas: [{ id: "p1", tipo: "texto", enunciado: "Primeira?" }, { id: "p2", tipo: "texto", enunciado: "Segunda?" }],
    criador_id: "gestor",
    sharepoint_registrado: false,
    revisao: 1,
  },
  resposta: {
    id: "resposta",
    perguntas: [{ id: "p1", tipo: "texto", enunciado: "Primeira?" }, { id: "p2", tipo: "texto", enunciado: "Segunda?" }],
    respostas: ["Um", "Dois"],
    respondente_id: null,
  },
}));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: {
  rpc: async (name: string) => ({ data: name === "reservar_registro_questionario" ? true : null, error: null }),
  from(table: string) {
    const rows = table === "questionarios_respostas" ? [fixture.resposta] : null;
    const value = table === "questionarios_internos" ? fixture.q : { full_name: "Gestor" };
    const chain = {
      select: () => chain, eq: () => chain, update: () => chain,
      single: async () => ({ data: value, error: null }),
      then: (resolve: (v: unknown) => unknown) => Promise.resolve({ data: rows, error: null }).then(resolve),
    };
    return chain;
  },
} }));
import { registrarQuestionarioSharePoint, excluirQuestionarioSharePoint } from "../lib/questionarios.server";
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
it("grava uma linha para o formulário e uma por resposta completa, sem duplicar no reenvio", async () => {
  vi.stubEnv("LOVABLE_API_KEY", "test"); vi.stubEnv("MICROSOFT_SHAREPOINT_API_KEY", "test");
  const items = new Map<string, { id: string; fields: Record<string, string> }>();
  const fetchMock = vi.fn(async (input: string, init: RequestInit) => {
    const url = new URL(input);
    if (init.method === "POST") {
      const { fields } = JSON.parse(String(init.body));
      const item = { id: String(items.size + 1), fields };
      items.set(fields.Title, item);
      return Response.json(item);
    }
    if (init.method === "PATCH") return new Response(null, { status: 204 });
    const filter = url.searchParams.get("$filter");
    const title = filter?.match(/fields\/Title eq '([^']+)'/)?.[1];
    return Response.json({ value: title ? [items.get(title)].filter(Boolean) : [...items.values()] });
  });
  vi.stubGlobal("fetch", fetchMock);
  await registrarQuestionarioSharePoint("form");
  await registrarQuestionarioSharePoint("form");
  expect(items.size).toBe(2);
  expect(items.get("R:form:resposta")?.fields).toMatchObject({ Pergunta: "1. Primeira?\n\n2. Segunda?", Resposta: "1. Um\n\n2. Dois", Respondidopor: "Anônimo" });
  expect(fetchMock.mock.calls.filter(([, init]) => init.method === "POST")).toHaveLength(2);
});
it("exclui somente registros do formulário selecionado inclusive respostas antigas", async () => {
  vi.stubEnv("LOVABLE_API_KEY", "test"); vi.stubEnv("MICROSOFT_SHAREPOINT_API_KEY", "test");
  const items = [{ id: "1", fields: { Title: "Q:form" } }, { id: "2", fields: { Title: "R:form:resposta" } }, { id: "3", fields: { Title: "Q:form:1" } }, { id: "4", fields: { Title: "R:form:resposta:1" } }, { id: "5", fields: { Title: "R:outro:resposta" } }];
  const deleted: string[] = [];
  vi.stubGlobal("fetch", vi.fn(async (input: string, init: RequestInit) => {
    if (init.method === "DELETE") { deleted.push(new URL(input).pathname.split("/").pop() ?? ""); return new Response(null, { status: 204 }); }
    return Response.json({ value: items });
  }));
  await excluirQuestionarioSharePoint("form");
  expect(deleted).toEqual(["1", "2", "3", "4"]);
});
it("falha do SharePoint não é reportada como exclusão concluída", async () => {
  vi.stubEnv("LOVABLE_API_KEY", "test"); vi.stubEnv("MICROSOFT_SHAREPOINT_API_KEY", "test");
  vi.stubGlobal("fetch", vi.fn(async (_input: string, init: RequestInit) => init.method === "DELETE" ? new Response("unavailable", { status: 503 }) : Response.json({ value: [{ id: "1", fields: { Title: "Q:form" } }] })));
  await expect(excluirQuestionarioSharePoint("form")).rejects.toThrow("503");
});
