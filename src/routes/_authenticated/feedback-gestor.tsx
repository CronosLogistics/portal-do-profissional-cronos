import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { MessageSquare, ExternalLink, RefreshCw, UserRound } from "lucide-react";
import { meusFeedbacksGestor } from "@/lib/feedback-gestor.functions";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
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
        <p className="mt-1 text-sm text-muted-foreground">Feedbacks recebidos</p>
        </div>
        <Button variant="outline" size="icon" title="Atualizar feedbacks" aria-label="Atualizar feedbacks" disabled={q.isFetching} onClick={() => void q.refetch()}><RefreshCw className={q.isFetching ? "animate-spin" : ""} /></Button>
      </header>
      {q.data.erro ? <p role="alert" className="border-l-2 border-destructive p-4 text-sm text-destructive">{q.data.erro}</p> : q.data.feedbacks.length === 0 ? <div className="py-12 text-center text-muted-foreground"><MessageSquare className="mx-auto mb-3 h-8 w-8" /><p className="text-sm">Nenhum feedback recebido por enquanto.</p></div> : (
        <Accordion type="multiple" className="w-full">
          {q.data.feedbacks.map(f => <AccordionItem key={f.id} value={f.id}>
            <AccordionTrigger className="gap-4 hover:no-underline">
              <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-2">
                <span className="flex min-w-0 items-center gap-2 text-foreground"><UserRound className="h-4 w-4 shrink-0 text-primary" /><span className="break-words">{f.gestor}</span></span>
                {f.data && <span className="text-xs text-muted-foreground">{new Date(f.data).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}</span>}
                {f.classificacao && <span className="text-xs font-semibold text-primary">{f.classificacao}</span>}
                {f.status && <span className="text-xs text-muted-foreground">{f.status}</span>}
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <p className="whitespace-pre-line break-words py-2 text-sm leading-relaxed text-foreground">{f.mensagem || "Sem comentário registrado."}</p>
              <Button asChild variant="link" className="mt-3 px-0"><a href={f.link} target="_blank" rel="noopener noreferrer">Link para o item <ExternalLink /></a></Button>
            </AccordionContent>
          </AccordionItem>)}
        </Accordion>
      )}
    </main>
  );
}
