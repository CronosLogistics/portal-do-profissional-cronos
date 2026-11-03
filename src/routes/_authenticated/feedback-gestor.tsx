import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/feedback-gestor")({
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
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">Feedback do gestor</h1>
        <p className="mt-1 text-sm text-muted-foreground">Acompanhe os feedbacks registrados pelo seu gestor.</p>
      </header>
      <p className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">Em breve</p>
    </main>
  );
}
