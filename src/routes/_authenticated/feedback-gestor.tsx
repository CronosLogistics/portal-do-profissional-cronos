import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { MessageSquare, RefreshCw, UserRound } from "lucide-react";
import { meusFeedbacksGestor } from "@/lib/feedback-gestor.functions";
import { Button } from "@/components/ui/button";

const feedbacksQuery = queryOptions({ queryKey: ["feedbacks-gestor-recebidos"], queryFn: () => meusFeedbacksGestor(), staleTime: 60_000 });

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
        <p className="mt-1 text-sm text-muted-foreground">Seus feedbacks recebidos.</p>
        </div>
        <Button variant="outline" size="icon" title="Atualizar feedbacks" aria-label="Atualizar feedbacks" disabled={q.isFetching} onClick={() => void q.refetch()}><RefreshCw className={q.isFetching ? "animate-spin" : ""} /></Button>
      </header>
      {q.data.erro ? <p role="alert" className="border-l-2 border-destructive p-4 text-sm text-destructive">{q.data.erro}</p> : <>
      {q.data.feedbacks.length === 0 ? <div className="py-12 text-center text-muted-foreground"><MessageSquare className="mx-auto mb-3 h-8 w-8" /><p className="text-sm">Nenhum feedback recebido por enquanto.</p></div> : (
        <div className="space-y-3">
          {q.data.feedbacks.map(f => <article key={f.id} className="rounded-lg border bg-card p-5">
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
      )}
      </>}
    </main>
  );
}
