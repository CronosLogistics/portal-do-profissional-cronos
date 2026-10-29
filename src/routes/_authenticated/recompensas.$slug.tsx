import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { Navbar } from "@/components/clube/Navbar";
import { Footer } from "@/components/clube/Footer";
import { ContentIcon } from "@/components/clube/ContentIcon";
import { getRewardProgram } from "@/lib/content.functions";

export const Route = createFileRoute("/_authenticated/recompensas/$slug")({
  loader: async ({ params }) => {
    const program = await getRewardProgram({ data: { slug: params.slug } });
    if (!program) throw notFound();
    return { program };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [
          { title: "Programa não encontrado | Portal do Profissional Cronos" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const { program } = loaderData;
    const title = `${program.title} | Programas de Recompensas Cronos`;
    const description = program.summary || program.description.slice(0, 155);
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: ProgramPage,
  errorComponent: () => <Fallback title="Não conseguimos carregar este programa" />,
  notFoundComponent: () => <Fallback title="Programa não encontrado" />,
});

function Fallback({ title }: { title: string }) {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 py-24 text-center">
        <h1 className="font-display text-2xl font-bold">{title}</h1>
        <Link to="/recompensas" className="mt-6 inline-block text-sm text-primary hover:underline">
          Ver todos os programas
        </Link>
      </main>
      <Footer />
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="glass-card rounded-2xl p-6">
      <h2 className="font-display text-base font-semibold text-accent">{title}</h2>
      <div className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
        {children}
      </div>
    </section>
  );
}

function ProgramPage() {
  const { program } = Route.useLoaderData();

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="mx-auto max-w-4xl px-4 py-12">
        <Link
          to="/recompensas"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Todos os programas
        </Link>

        <header className="glass-card mt-8 rounded-3xl p-8">
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent text-primary-foreground">
            <ContentIcon name={program.icon} className="h-7 w-7" />
          </span>
          <h1 className="mt-4 font-display text-3xl font-extrabold">{program.title}</h1>
          {program.summary ? <p className="mt-2 text-muted-foreground">{program.summary}</p> : null}
          {program.needs_content ? (
            <p className="mt-4 rounded-xl border border-accent/50 bg-accent/10 px-4 py-3 text-xs text-foreground">
              Conteúdo em preenchimento - informações completas serão publicadas em breve.
            </p>
          ) : null}
        </header>

        <div className="mt-6 grid gap-4">
          {program.description ? <Block title={program.description_title || "Como funciona"}>{program.description}</Block> : null}
          {program.how_to_join ? <Block title={program.how_to_join_title || "Como participar"}>{program.how_to_join}</Block> : null}
          {program.rules ? <Block title={program.rules_title || "Regras"}>{program.rules}</Block> : null}
          {program.contacts ? <Block title={program.contacts_title || "Contato"}>{program.contacts}</Block> : null}
        </div>
      </main>

      <Footer />
    </div>
  );
}
