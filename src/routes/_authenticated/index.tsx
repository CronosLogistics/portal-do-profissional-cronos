import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, Sparkles, Tag } from "lucide-react";

import { Navbar } from "@/components/clube/Navbar";
import { HeroVideo } from "@/components/clube/HeroVideo";

import { Footer } from "@/components/clube/Footer";
import { PartnerCard } from "@/components/clube/PartnerCard";
import { useOfficePartners } from "@/components/clube/OfficeContext";
import { Input } from "@/components/ui/input";
import { isNew, toCategory } from "@/lib/categories";
import { getSiteContent } from "@/lib/content.functions";
import { resolveHome } from "@/lib/site-content";
import { listPublicCategories, listPublicPartners, type PublicPartner } from "@/lib/partners.functions";

export const Route = createFileRoute("/_authenticated/")({
  loader: async () => {
    const [partners, categoryRows, siteRows] = await Promise.all([listPublicPartners(), listPublicCategories(), getSiteContent()]);
    return { partners, categoryRows, siteRows };
  },
  head: () => ({
    meta: [
      { title: "Espaço do Profissional Cronos | Parcerias e benefícios" },
      {
        name: "description",
        content:
          "Consulte as parcerias e benefícios exclusivos disponíveis aos profissionais da Cronos: saúde, academias, gastronomia, estética, educação, compras e lazer.",
      },
      { property: "og:title", content: "Espaço do Profissional Cronos" },
      {
        property: "og:description",
        content: "Todas as parcerias e descontos disponíveis aos profissionais da Cronos.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

function Home() {
  const { partners: allPartners, categoryRows, siteRows } = Route.useLoaderData();
  const t = resolveHome(siteRows);
  const partners = useOfficePartners(allPartners);
  const categories = useMemo(() => categoryRows.map(toCategory), [categoryRows]);
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return [] as PublicPartner[];
    return partners.filter((partner) => {
      return [
        partner.name,
        partner.summary,
        partner.benefit_description,
        partner.discount,
        partner.category_name,
      ]
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
  }, [partners, query]);

  const novidades = useMemo(() => {
    const recentes = partners.filter((partner) => isNew(partner.created_at));
    const destaques = partners.filter((partner) => partner.is_featured);
    const lista = recentes.length >= 3 ? recentes : [...recentes, ...destaques];
    return Array.from(new Map(lista.map((p) => [p.id, p])).values()).slice(0, 6);
  }, [partners]);

  const countByCategory = useMemo(() => {
    return partners.reduce<Record<string, number>>((acc, partner) => {
      acc[partner.category] = (acc[partner.category] ?? 0) + 1;
      return acc;
    }, {});
  }, [partners]);

  return (
    <div className="min-h-screen">
      <Navbar />

      <main>
        <HeroVideo>
          <div className="mx-auto max-w-4xl text-center">

            <span className="inline-flex items-center gap-2 rounded-full border border-accent/60 bg-accent/20 px-3 py-1 text-xs font-semibold text-foreground">
              <Sparkles className="h-3.5 w-3.5" />
              {t["home.badge"]}
            </span>
            <h1 className="mt-6 font-display text-4xl font-extrabold leading-tight sm:text-6xl">
              {t["home.title"]} <span className="text-gradient">{t["home.title_highlight"]}</span>
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground sm:text-lg">
              {t["home.description"]}
            </p>

            <div className="relative mx-auto mt-9 max-w-xl">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t["home.search_placeholder"]}
                aria-label="Buscar parceiro ou benefício"
                className="h-13 rounded-full border-border bg-card/70 pl-11 text-base shadow-none backdrop-blur"
              />
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              {partners.length} parcerias ativas em {categories.length} categorias
            </p>
          </div>
        </HeroVideo>


        {query.trim() ? (
          <section className="mx-auto max-w-6xl px-4 pb-6">
            <h2 className="font-display text-xl font-semibold">
              {results.length > 0
                ? `${results.length} resultado${results.length > 1 ? "s" : ""} para "${query}"`
                : `Nenhum parceiro encontrado para "${query}"`}
            </h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {results.map((partner) => (
                <PartnerCard key={partner.id} partner={partner} />
              ))}
            </div>
          </section>
        ) : null}

        {!query.trim() && novidades.length > 0 ? (
          <section className="mx-auto max-w-6xl px-4 pb-4">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="font-display text-2xl font-bold">{t["home.new_title"]}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t["home.new_text"]}
                </p>
              </div>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {novidades.map((partner) => (
                <PartnerCard key={partner.id} partner={partner} />
              ))}
            </div>
          </section>
        ) : null}

        <section className="mx-auto max-w-6xl px-4 pt-14">
          <h2 className="font-display text-2xl font-bold">{t["home.explore_title"]}</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {[
              {
                to: "/beneficios" as const,
                title: t["home.card_benefits_title"],
                text: t["home.card_benefits_text"],
              },
              {
                to: "/parceiros" as const,
                title: t["home.card_partners_title"],
                text: t["home.card_partners_text"],
              },
              {
                to: "/recompensas" as const,
                title: t["home.card_rewards_title"],
                text: t["home.card_rewards_text"],
              },
            ].map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="glass-card rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 hover:border-primary/50"
              >
                <h3 className="font-display text-lg font-semibold">{item.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{item.text}</p>
              </Link>
            ))}
          </div>
        </section>

        <section id="categorias" className="mx-auto max-w-6xl scroll-mt-20 px-4 pt-14">
          <h2 className="font-display text-2xl font-bold">{t["home.categories_title"]}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t["home.categories_text"]}
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((category) => (
              <Link
                key={category.slug}
                to="/categorias/$slug"
                params={{ slug: category.slug }}
                className="glass-card group rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 hover:border-accent/50"
              >
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent text-primary-foreground">
                  <category.icon className="h-6 w-6" aria-hidden="true" />
                </span>
                <h3 className="mt-4 font-display text-lg font-semibold">{category.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{category.description}</p>
                <span className="mt-5 inline-flex items-center gap-1.5 text-xs font-medium text-accent">
                  <Tag className="h-3.5 w-3.5" />
                  {countByCategory[category.slug] ?? 0} parceiro
                  {(countByCategory[category.slug] ?? 0) === 1 ? "" : "s"}
                </span>
              </Link>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
