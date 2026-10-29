import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ExternalLink, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SETORES, filtrarFormularios } from "@/lib/formularios";

export const Route = createFileRoute("/_authenticated/formularios")({
  head: () => ({
    meta: [
      { title: "Formulários | Portal do Profissional Cronos" },
      { name: "description", content: "Central de formulários e canais de solicitação da Cronos Logistics, por setor." },
      { property: "og:title", content: "Formulários | Portal do Profissional Cronos" },
      { property: "og:description", content: "Acesso rápido aos formulários oficiais da Cronos Logistics." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: FormulariosPage,
});

function FormulariosPage() {
  const [busca, setBusca] = useState("");
  const [setor, setSetor] = useState<string | undefined>();
  const lista = filtrarFormularios(busca, setor);
  const setores = SETORES.filter((s) => lista.some((f) => f.setor === s));

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-8">
      <h1 className="text-3xl font-bold text-foreground">Formulários</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Clique no formulário desejado (abre em nova aba). Formulários com código RQ são registros controlados do SGQ.
      </p>
      <div className="mt-6 flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar formulário" value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>
        <Button size="sm" variant={!setor ? "default" : "outline"} onClick={() => setSetor(undefined)}>Todos</Button>
        {SETORES.map((s) => (
          <Button key={s} size="sm" variant={setor === s ? "default" : "outline"} onClick={() => setSetor(s)}>{s}</Button>
        ))}
      </div>
      {lista.length === 0 && <p className="mt-8 rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">Nenhum formulário encontrado.</p>}
      {setores.map((s) => (
        <section key={s} className="mt-8">
          <h2 className="mb-3 text-lg font-bold text-primary">{s}</h2>
          <div className="divide-y rounded-lg border bg-card">
            {lista.filter((f) => f.setor === s).map((f) => (
              <a key={f.url} href={f.url} target="_blank" rel="noreferrer" className="flex items-center justify-between gap-4 p-4 hover:bg-muted/50">
                <div className="min-w-0">
                  <p className="font-semibold text-foreground">
                    {f.codigo && <span className="mr-2 rounded bg-secondary px-1.5 py-0.5 text-xs text-secondary-foreground">{f.codigo}</span>}
                    {f.titulo}
                  </p>
                  {f.descricao && <p className="text-sm text-muted-foreground">{f.descricao}</p>}
                </div>
                <span className="flex shrink-0 items-center gap-1 text-sm font-medium text-primary">
                  <span className="hidden sm:inline">{f.acao}</span> <ExternalLink className="h-4 w-4" />
                </span>
              </a>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
