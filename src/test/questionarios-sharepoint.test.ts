// @vitest-environment node
import { afterEach, expect, it, vi } from "vitest";
const fixture = vi.hoisted(() => ({
  q: { id: "form", titulo: "Pesquisa", anonimo: true, perguntas: ["Primeira?", "Segunda?"], criador_id: "gestor", sharepoint_registrado: false, revisao: 1 },
  resposta: { id: "resposta", perguntas: ["Primeira?", "Segunda?"], respostas: ["Um", "Dois"], respondente_id: null },
}));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: {
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
import { registrarQuestionarioSharePoint } from "../lib/questionarios.server";
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