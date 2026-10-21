import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";

import { Navbar } from "@/components/clube/Navbar";
import { Footer } from "@/components/clube/Footer";
import { ContentIcon } from "@/components/clube/ContentIcon";
import { listBenefits } from "@/lib/content.functions";
import { getSiteContent } from "@/lib/content.functions";
import { resolveText } from "@/lib/site-content";

export const Route = createFileRoute("/_authenticated/beneficios/")({
  loader: async () => {
    const [benefits, siteRows] = await Promise.all([listBenefits(), getSiteContent()]);
    return { benefits, siteRows };
  },
  head: () => ({
    meta: [
      { title: "Benefícios | Espaço do Profissional Cronos" },
      {
        name: "description",
        content:
          "Plano de saúde, vale alimentação, vale transporte, Total Pass, Cronos Learning, Farma Sesi, Sesc, Cronos Nômade e mais benefícios dos profissionais da Cronos.",
      },
      { property: "og:title", content: "Benefícios dos profissionais Cronos" },
      {
        property: "og:description",
        content: "Tudo sobre os benefícios oferecidos aos profissionais da Cronos.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BenefitsPage,
  errorComponent: () => (
    <Fallback title="Não conseguimos carregar os benefícios agora" />
  ),
});

function Fallback({ title }: { title: string }) {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 py-24 text-center">
        <h1 className="font-display text-2xl font-bold">{title}</h1>
        <Link to="/" className="mt-6 inline-block text-sm text-primary hover:underline">
          Voltar para o início
        </Link>
      </main>
      <Footer />
    </div>
  );
}

function BenefitsPage() {
  const { benefits, siteRows } = Route.useLoaderData();

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="mx-auto max-w-6xl px-4 py-12">
        <header>
          <h1 className="font-display text-3xl font-extrabold sm:text-4xl">{resolveText(siteRows, "beneficios.title")}</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            {resolveText(siteRows, "beneficios.text")}
          </p>
        </header>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {benefits.map((benefit) => (
            <Link
              key={benefit.id}
              to="/beneficios/$slug"
              params={{ slug: benefit.slug }}
              className="glass-card group flex flex-col rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 hover:border-primary/50"
            >
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent text-primary-foreground">
                <ContentIcon name={benefit.icon} className="h-6 w-6" />
              </span>
              <h2 className="mt-4 font-display text-lg font-semibold">{benefit.title}</h2>
              <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">{benefit.summary}</p>
              <span className="mt-5 inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors group-hover:text-primary">
                Ver detalhes
                <ArrowUpRight className="h-3.5 w-3.5" />
              </span>
            </Link>
          ))}
        </div>

        {benefits.length === 0 ? (
          <p className="glass-card mt-10 rounded-2xl p-8 text-sm text-muted-foreground">
            Os benefícios serão publicados aqui em breve.
          </p>
        ) : null}
      </main>

      <Footer />
    </div>
  );
}
