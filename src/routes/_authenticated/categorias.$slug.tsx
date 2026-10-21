import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { Navbar } from "@/components/clube/Navbar";
import { Footer } from "@/components/clube/Footer";
import { PartnerCard } from "@/components/clube/PartnerCard";
import { useOfficePartners } from "@/components/clube/OfficeContext";
import { toCategory } from "@/lib/categories";
import { listPublicCategories, listPublicPartners } from "@/lib/partners.functions";

export const Route = createFileRoute("/_authenticated/categorias/$slug")({
  loader: async ({ params }) => {
    const categoryRows = await listPublicCategories();
    const category = categoryRows.find((row) => row.slug === params.slug);
    if (!category) throw notFound();
    const partners = await listPublicPartners();
    return {
      category,
      categoryRows,
      partners: partners.filter((partner) => partner.category === category.slug),
    };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [{ title: "Categoria não encontrada | Espaço do Profissional Cronos" }],
      };
    }
    const title = `${loaderData.category.name} | Espaço do Profissional Cronos`;
    const description = `Parceiros de ${loaderData.category.name.toLowerCase()} com desconto para profissionais da Cronos: ${loaderData.category.description}.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: CategoryPage,
  errorComponent: () => <SimpleMessage title="Não conseguimos carregar esta categoria" />,
  notFoundComponent: () => <SimpleMessage title="Categoria não encontrada" />,
});

function SimpleMessage({ title }: { title: string }) {
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

function CategoryPage() {
  const { category: categoryRow, partners: allPartners, categoryRows } = Route.useLoaderData();
  const partners = useOfficePartners(allPartners);
  const category = toCategory(categoryRow);
  const categories = categoryRows.map(toCategory);

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="mx-auto max-w-6xl px-4 py-12">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Todas as categorias
        </Link>

        <header className="mt-8">
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent text-primary-foreground">
            <category.icon className="h-7 w-7" aria-hidden="true" />
          </span>
          <h1 className="mt-4 font-display text-3xl font-extrabold sm:text-4xl">
            {category.name}
          </h1>
          <p className="mt-2 text-muted-foreground">{category.description}</p>
        </header>

        {partners.length > 0 ? (
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {partners.map((partner) => (
              <PartnerCard key={partner.id} partner={partner} />
            ))}
          </div>
        ) : (
          <p className="glass-card mt-10 rounded-2xl p-8 text-sm text-muted-foreground">
            Ainda não temos parceiros nesta categoria. Novas parcerias são divulgadas aqui assim
            que fechadas.
          </p>
        )}

        <section className="mt-16">
          <h2 className="font-display text-lg font-semibold">Outras categorias</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {categories
              .filter((item) => item.slug !== category.slug)
              .map((item) => (
                <Link
                  key={item.slug}
                  to="/categorias/$slug"
                  params={{ slug: item.slug }}
                  className="flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:border-primary/60 hover:text-foreground"
                >
                  <item.icon className="h-4 w-4 text-accent" aria-hidden="true" />
                  {item.name}
                </Link>
              ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
