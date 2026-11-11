import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ExternalLink, MessageSquare, RefreshCw, UserRound } from "lucide-react";
import { feedbacksQuery, LINK_FEEDBACK_GESTOR } from "@/lib/feedback-gestor-query";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { FeedbackGestor } from "@/lib/feedback-gestor.rules";


export const Route = createFileRoute("/_authenticated/feedback-gestor")({
  loader: ({ context }) => context.queryClient.ensureQueryData(feedbacksQuery),
  pendingComponent: () => <p className="p-8 text-sm text-muted-foreground">Carregando feedbacks…</p>,
  head: () => ({
    meta: [
      { title: "Feedback do gestor | Portal do Profissional Cronos" },
      { name: "description", content: "Feedbacks do gestor na Cronos Logistics." },
      { property: "og:title", content: "Feedback do gestor | Portal do Profissional Cronos" },
      { property: "og:description", content: "Feedbacks do gestor em um só lugar." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: FeedbackGestorPage,
});

function FeedbackGestorPage() {
  const q = useSuspenseQuery(feedbacksQuery);
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-8">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
        <h1 className="text-3xl font-bold text-foreground">Feedback do gestor</h1>
        <p className="mt-1 text-sm text-muted-foreground">{q.data.temLiderados ? "Feedbacks recebidos e acompanhamento dos seus liderados." : "Seus feedbacks recebidos."}</p>
        </div>
        <Button variant="outline" size="icon" title="Atualizar feedbacks" aria-label="Atualizar feedbacks" disabled={q.isFetching} onClick={() => void q.refetch()}><RefreshCw className={q.isFetching ? "animate-spin" : ""} /></Button>
      </header>
      {q.data.temLiderados && <a href={LINK_FEEDBACK_GESTOR} target="_blank" rel="noreferrer" className="mb-6 flex items-center justify-between gap-4 rounded-lg border bg-card p-4 hover:bg-muted/50"><span className="font-semibold text-foreground">Registrar feedback para liderado</span><ExternalLink className="h-4 w-4 shrink-0 text-primary" /></a>}
      {q.data.temLiderados ? <Tabs defaultValue="recebidos">
        <TabsList className="mb-4 h-auto w-full flex-wrap justify-start gap-1 sm:w-auto">
          <TabsTrigger value="liderados">Feedbacks dos liderados</TabsTrigger>
          <TabsTrigger value="recebidos">Feedbacks recebidos</TabsTrigger>
        </TabsList>
        <TabsContent value="liderados">
          {q.data.erro || q.data.erroLiderados ? <p role="alert" className="border-l-2 border-destructive p-4 text-sm text-destructive">{q.data.erro || q.data.erroLiderados}</p> : <ListaFeedbacks feedbacks={q.data.liderados} liderados />}
        </TabsContent>
        <TabsContent value="recebidos">
          {q.data.erro ? <p role="alert" className="border-l-2 border-destructive p-4 text-sm text-destructive">{q.data.erro}</p> : <ListaFeedbacks feedbacks={q.data.feedbacks} />}
        </TabsContent>
      </Tabs> : <>
        {q.data.erroLiderados && <p role="alert" className="mb-4 border-l-2 border-destructive p-4 text-sm text-destructive">{q.data.erroLiderados}</p>}
        {q.data.erro ? <p role="alert" className="border-l-2 border-destructive p-4 text-sm text-destructive">{q.data.erro}</p> : <ListaFeedbacks feedbacks={q.data.feedbacks} />}
      </>}
    </main>
  );
}

function ListaFeedbacks({ feedbacks: todos, liderados = false }: { feedbacks: FeedbackGestor[]; liderados?: boolean }) {
  const [pessoa, setPessoa] = useState("");
  const [busca, setBusca] = useState("");
  const pessoas = [...new Set(todos.map(f => f.profissional).filter(Boolean))].sort((a, b) => a.localeCompare(b, "pt-BR"));
  const termo = busca.trim().toLowerCase();
  const feedbacks = liderados ? todos.filter(f => (!pessoa || f.profissional === pessoa) && (!termo || [f.mensagem, f.gestor, f.classificacao, f.profissional].some(t => t.toLowerCase().includes(termo)))) : todos;
  const filtros = liderados && todos.length > 0 && <div className="mb-4 flex flex-wrap items-center gap-2">
    <select aria-label="Filtrar por profissional" value={pessoa} onChange={e => setPessoa(e.target.value)} className="h-9 rounded-md border bg-card px-3 text-sm text-foreground">
      <option value="">Todos os liderados</option>
      {pessoas.map(p => <option key={p} value={p}>{p}</option>)}
    </select>
    <input aria-label="Buscar nos feedbacks" placeholder="Buscar no comentário, gestor ou classificação" value={busca} onChange={e => setBusca(e.target.value)} className="h-9 min-w-[16rem] flex-1 rounded-md border bg-card px-3 text-sm text-foreground" />
    {(pessoa || busca) && <Button variant="ghost" size="sm" onClick={() => { setPessoa(""); setBusca(""); }}>Limpar filtros</Button>}
    <span className="text-xs text-muted-foreground">{feedbacks.length} de {todos.length}</span>
  </div>;
  return <>{filtros}{feedbacks.length === 0 ? <div className="py-12 text-center text-muted-foreground"><MessageSquare className="mx-auto mb-3 h-8 w-8" /><p className="text-sm">{liderados ? "Nenhum feedback dos seus liderados por enquanto." : "Nenhum feedback recebido por enquanto."}</p></div> : (
        <div className="space-y-3">
          {feedbacks.map(f => <article key={f.id} className="rounded-lg border bg-card p-5">
            {liderados && <h2 className="mb-3 break-words text-base font-semibold text-foreground">{f.profissional}</h2>}
            <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
              <MessageSquare className="h-4 w-4 shrink-0 text-primary" />
              {f.data && <span className="font-semibold text-foreground">{new Date(f.data).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}</span>}
              {f.classificacao && <span className="rounded-full bg-secondary px-2 py-0.5 text-secondary-foreground">{f.classificacao}</span>}
            </div>
            <p className="whitespace-pre-line break-words text-sm text-foreground">{f.mensagem || "Sem comentário registrado."}</p>
            <dl className="mt-3 grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
              <div className="flex min-w-0 gap-1"><UserRound className="h-3.5 w-3.5 shrink-0" /><span className="break-words">Gestor(a): {f.gestor}</span></div>
            </dl>
          </article>)}
        </div>
      )}</>;
}
