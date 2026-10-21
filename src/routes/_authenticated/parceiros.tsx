import { createFileRoute, Link } from "@tanstack/react-router";


import { Navbar } from "@/components/clube/Navbar";
import { Footer } from "@/components/clube/Footer";
import { PartnerCard } from "@/components/clube/PartnerCard";
import { useOfficePartners } from "@/components/clube/OfficeContext";
import { toCategory } from "@/lib/categories";
import { listPublicCategories, listPublicPartners } from "@/lib/partners.functions";
import { getSiteContent } from "@/lib/content.functions";
import { resolveText } from "@/lib/site-content";

export const Route = createFileRoute("/_authenticated/parceiros")({
  loader: async () => {
    const [partners, categoryRows, siteRows] = await Promise.all([listPublicPartners(), listPublicCategories(), getSiteContent()]);
    return { partners, categoryRows, siteRows };
  },
  head: () => ({
    meta: [
      { title: "Parceiros e descontos | Espaço do Profissional Cronos" },
      {
        name: "description",
        content:
          "Descontos em alimentação, educação, estética e saúde para os profissionais da Cronos e suas famílias.",
      },
      { property: "og:title", content: "Parceiros e descontos Cronos" },
      {
        property: "og:description",
        content: "Parcerias com desconto em alimentação, educação, estética e saúde.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PartnersPage,
  errorComponent: () => (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 py-24 text-center">
        <h1 className="font-display text-2xl font-bold">
          Não conseguimos carregar os parceiros agora
        </h1>
        <Link to="/" className="mt-6 inline-block text-sm text-primary hover:underline">
          Voltar para o início
        </Link>
      </main>
      <Footer />
    </div>
  ),
});

function PartnersPage() {
  const { partners: allPartners, categoryRows, siteRows } = Route.useLoaderData();
  const partners = useOfficePartners(allPartners);
  const categories = categoryRows.map(toCategory);

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="mx-auto max-w-6xl px-4 py-12">
        <header>
          <h1 className="font-display text-3xl font-extrabold sm:text-4xl">
            {resolveText(siteRows, "parceiros.title")}
          </h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            {resolveText(siteRows, "parceiros.text")}
          </p>
        </header>

        {categories.map((category) => {
          const list = partners.filter((partner) => partner.category === category.slug);
          if (list.length === 0) return null;
          return (
            <section key={category.slug} className="mt-14">
              <h2 className="flex items-center gap-2 font-display text-xl font-bold">
                <category.icon className="h-5 w-5 text-accent" aria-hidden="true" />
                {category.name}
              </h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {list.map((partner) => (
                  <PartnerCard key={partner.id} partner={partner} />
                ))}
              </div>
            </section>
          );
        })}
      </main>

      <Footer />
    </div>
  );
}
