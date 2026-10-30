import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Award, Building2, UserRound, Users } from "lucide-react";
import { meusElogios } from "@/lib/feedback.functions";
import type { Elogio } from "@/lib/feedback.rules";

export const Route = createFileRoute("/_authenticated/feedback")({
  head: () => ({
    meta: [
      { title: "Elogios | Portal do Profissional Cronos" },
      { name: "description", content: "Elogios recebidos em que você está envolvida(o) na Cronos Logistics." },
      { property: "og:title", content: "Elogios | Portal do Profissional Cronos" },
      { property: "og:description", content: "Seus elogios e os da sua equipe em um só lugar." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: FeedbackPage,
});

const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "");

function FeedbackPage() {
  const buscar = useServerFn(meusElogios);
  const q = useQuery({ queryKey: ["feedback"], queryFn: () => buscar() });
  const [aba, setAba] = useState<"meu" | "equipe">("meu");
  const lista = q.data?.elogios ?? [];
  const meus = lista.filter((e) => e.vinculo === "meu");
  const equipe = lista.filter((e) => e.vinculo === "equipe");
  const visiveis = aba === "meu" ? meus : equipe;

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">Elogios</h1>
        <p className="mt-1 text-sm text-muted-foreground">Elogios registrados pela Qualidade em que você está envolvida(o).</p>
      </header>
      {equipe.length > 0 && (
        <div className="mb-4 inline-flex rounded-lg border bg-card p-1">
          {([["meu", `Meus elogios (${meus.length})`], ["equipe", `Minha equipe (${equipe.length})`]] as const).map(([v, l]) => (
            <button key={v} onClick={() => setAba(v)} className={`rounded-md px-4 py-1.5 text-sm font-semibold ${aba === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>{l}</button>
          ))}
        </div>
      )}
      {q.isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
      {q.data?.erro && <p className="rounded-lg border border-destructive/40 bg-card p-4 text-sm text-destructive">{q.data.erro}</p>}
      {q.data && !q.data.erro && visiveis.length === 0 && (
        <p className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">Nenhum elogio encontrado por enquanto.</p>
      )}
      <div className="space-y-3">{visiveis.map((e) => <Cartao key={e.id} e={e} />)}</div>
    </main>
  );
}

function Cartao({ e }: { e: Elogio }) {
  return (
    <article className="rounded-lg border bg-card p-5">
      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
        <Award className="h-4 w-4 text-primary" />
        <span className="font-semibold text-foreground">{fmt(e.data)}</span>
        {e.departamento && <span className="rounded-full bg-secondary px-2 py-0.5 text-secondary-foreground">{e.departamento}</span>}
        {e.status && <span className="rounded-full border px-2 py-0.5 text-muted-foreground">{e.status}</span>}
      </div>
      <p className="whitespace-pre-line text-sm text-foreground">{e.detalhamento || "Sem detalhamento."}</p>
      <dl className="mt-3 grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
        {e.cliente && <div className="flex gap-1"><Building2 className="h-3.5 w-3.5" /> Cliente: {e.cliente}</div>}
        {e.envolvidos.length > 0 && <div className="flex gap-1"><Users className="h-3.5 w-3.5" /> Envolvidos: {e.envolvidos.join(", ")}</div>}
        {e.gestor && <div className="flex gap-1"><UserRound className="h-3.5 w-3.5" /> Gestor(a): {e.gestor}</div>}
        <div className="flex gap-1"><UserRound className="h-3.5 w-3.5" /> Elogio de: {e.elogiador || "Não informado"}</div>
      </dl>
    </article>
  );
}
