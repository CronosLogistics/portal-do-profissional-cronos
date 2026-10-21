import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";

import { Navbar } from "@/components/clube/Navbar";
import { Footer } from "@/components/clube/Footer";
import { ContentIcon } from "@/components/clube/ContentIcon";
import { listRewardPrograms } from "@/lib/content.functions";
import { getSiteContent } from "@/lib/content.functions";
import { resolveText } from "@/lib/site-content";

export const Route = createFileRoute("/_authenticated/recompensas/")({
  loader: async () => {
    const [programs, siteRows] = await Promise.all([listRewardPrograms(), getSiteContent()]);
    return { programs, siteRows };
  },
  head: () => ({
    meta: [
      { title: "Programas de Recompensas | Portal do Profissional Cronos" },
      {
        name: "description",
        content:
          "Indique um Talento, Cronos Genius, PPR e Bônus de Recompras: como participar dos programas de recompensas da Cronos.",
      },
      { property: "og:title", content: "Programas de Recompensas Cronos" },
      {
        property: "og:description",
        content: "Programas que reconhecem e premiam os profissionais da Cronos.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProgramsPage,
  errorComponent: () => (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 py-24 text-center">
        <h1 className="font-display text-2xl font-bold">
          Não conseguimos carregar os programas agora
        </h1>
        <Link to="/" className="mt-6 inline-block text-sm text-primary hover:underline">
          Voltar para o início
        </Link>
      </main>
      <Footer />
    </div>
  ),
});

function ProgramsPage() {
  const { programs, siteRows } = Route.useLoaderData();

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="mx-auto max-w-6xl px-4 py-12">
        <header>
          <h1 className="font-display text-3xl font-extrabold sm:text-4xl">
            {resolveText(siteRows, "recompensas.title")}
          </h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            {resolveText(siteRows, "recompensas.text")}
          </p>
        </header>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {programs.map((program) => (
            <Link
              key={program.id}
              to="/recompensas/$slug"
              params={{ slug: program.slug }}
              className="glass-card group flex flex-col rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 hover:border-primary/50"
            >
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent text-primary-foreground">
                <ContentIcon name={program.icon} className="h-6 w-6" />
              </span>
              <h2 className="mt-4 font-display text-lg font-semibold">{program.title}</h2>
              <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">{program.summary}</p>
              <span className="mt-5 inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors group-hover:text-primary">
                Ver detalhes
                <ArrowUpRight className="h-3.5 w-3.5" />
              </span>
            </Link>
          ))}
        </div>

        {programs.length === 0 ? (
          <p className="glass-card mt-10 rounded-2xl p-8 text-sm text-muted-foreground">
            Os programas serão publicados aqui em breve.
          </p>
        ) : null}
      </main>

      <Footer />
    </div>
  );
}
