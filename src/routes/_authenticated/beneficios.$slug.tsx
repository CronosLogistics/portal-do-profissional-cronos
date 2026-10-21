import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, FileText, Globe, Phone } from "lucide-react";

import { Navbar } from "@/components/clube/Navbar";
import { Footer } from "@/components/clube/Footer";
import { ContentIcon } from "@/components/clube/ContentIcon";
import { getBenefit } from "@/lib/content.functions";

export const Route = createFileRoute("/_authenticated/beneficios/$slug")({
  loader: async ({ params }) => {
    const result = await getBenefit({ data: { slug: params.slug } });
    if (!result) throw notFound();
    return result;
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [
          { title: "Benefício não encontrado | Portal do Profissional Cronos" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const { benefit } = loaderData;
    const title = `${benefit.title} | Benefícios Cronos`;
    const description = benefit.summary || benefit.intro.slice(0, 155);
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
  component: BenefitPage,
  errorComponent: () => <Fallback title="Não conseguimos carregar este benefício" />,
  notFoundComponent: () => <Fallback title="Benefício não encontrado" />,
});

function Fallback({ title }: { title: string }) {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 py-24 text-center">
        <h1 className="font-display text-2xl font-bold">{title}</h1>
        <Link to="/beneficios" className="mt-6 inline-block text-sm text-primary hover:underline">
          Ver todos os benefícios
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

function BenefitPage() {
  const { benefit, images } = Route.useLoaderData();

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="mx-auto max-w-4xl px-4 py-12">
        <Link
          to="/beneficios"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Todos os benefícios
        </Link>

        <header className="glass-card mt-8 rounded-3xl p-8">
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent text-primary-foreground">
            <ContentIcon name={benefit.icon} className="h-7 w-7" />
          </span>
          <h1 className="mt-4 font-display text-3xl font-extrabold">{benefit.title}</h1>
          {benefit.summary ? (
            <p className="mt-2 text-muted-foreground">{benefit.summary}</p>
          ) : null}
          {benefit.needs_content ? (
            <p className="mt-4 rounded-xl border border-accent/50 bg-accent/10 px-4 py-3 text-xs text-foreground">
              Conteúdo em preenchimento — informações completas serão publicadas em breve.
            </p>
          ) : null}
        </header>

        <div className="mt-6 grid gap-4">
          {benefit.intro ? <Block title={benefit.intro_title || "Sobre o benefício"}>{benefit.intro}</Block> : null}
          {benefit.values_info ? <Block title={benefit.values_title || "Valores"}>{benefit.values_info}</Block> : null}
          {benefit.how_to_use ? <Block title={benefit.how_to_use_title || "Como utilizar"}>{benefit.how_to_use}</Block> : null}
          {benefit.rules ? <Block title={benefit.rules_title || "Regras e condições"}>{benefit.rules}</Block> : null}
          {benefit.contacts ? <Block title={benefit.contacts_title || "Canais de contato"}>{benefit.contacts}</Block> : null}

          {images.length > 0 ? (
            <section className="glass-card rounded-2xl p-6">
              <h2 className="font-display text-base font-semibold text-accent">
                Brindes por tempo de empresa
              </h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {images.map((image) => (
                  <figure key={image.id} className="rounded-xl border border-border/70 p-3">
                    {image.image_url ? (
                      <img
                        src={image.image_url}
                        alt={image.caption || `Brinde ${image.year}`}
                        loading="lazy"
                        className="h-40 w-full rounded-lg object-cover"
                      />
                    ) : (
                      <div className="flex h-40 w-full items-center justify-center rounded-lg bg-muted/40 text-xs text-muted-foreground">
                        Foto em breve
                      </div>
                    )}
                    <figcaption className="mt-3 text-sm">
                      <span className="font-semibold text-foreground">{image.year}</span>
                      <span className="block text-muted-foreground">{image.caption}</span>
                    </figcaption>
                  </figure>
                ))}
              </div>
            </section>
          ) : null}

          {benefit.website || benefit.materials_url ? (
            <section className="glass-card rounded-2xl p-6">
              <h2 className="font-display text-base font-semibold text-accent">Links úteis</h2>
              <ul className="mt-3 grid gap-3 text-sm">
                {benefit.website ? (
                  <li className="flex items-start gap-2.5">
                    <Globe className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <a
                      href={benefit.website}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="text-muted-foreground hover:text-foreground hover:underline"
                    >
                      {benefit.website.replace(/^https?:\/\//, "")}
                    </a>
                  </li>
                ) : null}
                {benefit.materials_url ? (
                  <li className="flex items-start gap-2.5">
                    <FileText className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <a
                      href={benefit.materials_url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="text-muted-foreground hover:text-foreground hover:underline"
                    >
                      Materiais e passo a passo
                    </a>
                  </li>
                ) : null}
              </ul>
            </section>
          ) : null}

          {!benefit.contacts && !benefit.website ? (
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <Phone className="h-3.5 w-3.5" />
              Dúvidas: fale com a Gestão de Pessoas.
            </p>
          ) : null}
        </div>
      </main>

      <Footer />
    </div>
  );
}
