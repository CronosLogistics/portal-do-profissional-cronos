import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

const Corpo = z.object({
  mes_ano: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
  html: z.string().min(1).max(2_000_000),
});

async function iguais(a: string, b: string) {
  const enc = new TextEncoder();
  const [x, y] = await Promise.all([crypto.subtle.digest("SHA-256", enc.encode(a)), crypto.subtle.digest("SHA-256", enc.encode(b))]);
  const ax = new Uint8Array(x), by = new Uint8Array(y);
  let d = 0;
  for (let i = 0; i < ax.length; i++) d |= (ax[i] ?? 0) ^ (by[i] ?? 0);
  return d === 0;
}

/** Recebe do Power Automate o HTML do compilado mensal de elogios (mesmo HTML do e-mail). */
export const Route = createFileRoute("/api/public/compilado-elogios")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const segredo = process.env["COMPILADO_WEBHOOK_SECRET"];
        const enviado = request.headers.get("x-webhook-secret") ?? "";
        if (!segredo || !enviado || !(await iguais(enviado, segredo))) {
          return Response.json({ erro: "Não autorizado" }, { status: 401 });
        }
        let json: unknown;
        try { json = await request.json(); } catch { return Response.json({ erro: "JSON inválido" }, { status: 400 }); }
        const r = Corpo.safeParse(json);
        if (!r.success) return Response.json({ erro: "Esperado { mes_ano: 'AAAA-MM', html }" }, { status: 400 });
        const [ano, mes] = r.data.mes_ano.split("-");
        const titulo = `Elogios Recebidos ${MESES[Number(mes) - 1]} de ${ano}`;
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin.rpc("receber_compilado", { _mes_ano: r.data.mes_ano, _html: r.data.html, _titulo: titulo });
        if (error) return Response.json({ erro: "Falha ao gravar" }, { status: 500 });
        return Response.json({ sucesso: true, aviso_id: data });
      },
    },
  },
});
