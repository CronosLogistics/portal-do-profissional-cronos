import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ExternalLink, Search, Pencil, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { filtrarFormularios, type Formulario } from "@/lib/formularios";
import { useQuery } from "@tanstack/react-query";
import { useCurrentUser } from "@/hooks/useAuth";
import { listarFormularios, formulariosKey } from "@/lib/formularios-client";
import { FormularioEditor } from "@/components/portal/FormularioEditor";

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
  const me = useCurrentUser();
  const pode = Boolean(me.data?.can("formularios.gerenciar"));
  const forms = useQuery({ queryKey: formulariosKey, queryFn: listarFormularios });
  const [editor, setEditor] = useState<{ formulario?: Formulario } | null>(null);
  const todos = forms.data ?? [];
  const todosSetores = [...new Set(todos.map(f => f.setor))].sort((a,b) => a.localeCompare(b,"pt-BR"));
  const lista = filtrarFormularios(todos, busca, setor);
  const setores = todosSetores.filter((s) => lista.some((f) => f.setor === s));

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-8">
      <header className="flex flex-wrap items-center justify-between gap-3"><h1 className="text-3xl font-bold text-foreground">Formulários</h1>{pode && <Button onClick={() => setEditor({})}><Plus />Novo formulário</Button>}</header>
      <p className="mt-1 text-sm text-muted-foreground">
        Clique no formulário desejado (abre em nova aba). Formulários com código RQ são registros controlados do SGQ.
      </p>
      <div className="mt-6 flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar formulário" value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>
        <Button size="sm" variant={!setor ? "default" : "outline"} onClick={() => setSetor(undefined)}>Todos</Button>
        {todosSetores.map((s) => (
          <Button key={s} size="sm" variant={setor === s ? "default" : "outline"} onClick={() => setSetor(s)}>{s}</Button>
        ))}
      </div>
      {forms.isPending && <p className="mt-8 text-muted-foreground">Carregando formulários…</p>}
      {forms.error && <p role="alert" className="mt-8 text-destructive">Não foi possível carregar os formulários.</p>}
      {!forms.isPending && !forms.error && lista.length === 0 && <p className="mt-8 rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">Nenhum formulário encontrado.</p>}
      {setores.map((s) => (
        <section key={s} className="mt-8">
          <h2 className="mb-3 text-lg font-bold text-primary">{s}</h2>
          <div className="divide-y rounded-lg border bg-card">
            {lista.filter((f) => f.setor === s).map((f) => (
              <div key={f.id} className="flex items-center gap-2 pr-3"><a href={f.url} target="_blank" rel="noreferrer" className="flex min-w-0 flex-1 items-center justify-between gap-4 p-4 hover:bg-muted/50">
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
              </a>{pode && <Button size="icon" variant="ghost" title={`Editar ${f.titulo}`} aria-label={`Editar ${f.titulo}`} onClick={() => setEditor({ formulario: f })}><Pencil /></Button>}</div>
            ))}
          </div>
        </section>
      ))}
      {pode && editor && <FormularioEditor formulario={editor.formulario} setores={todosSetores} onClose={() => setEditor(null)} />}
    </main>
  );
}
