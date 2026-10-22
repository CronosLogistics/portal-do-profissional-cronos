import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, Download, FileText, Globe, Instagram, MapPin, MessageCircle } from "lucide-react";

import { Navbar } from "@/components/clube/Navbar";
import { Footer } from "@/components/clube/Footer";
import { PartnerLogo } from "@/components/clube/PartnerLogo";
import { formatBytes, getIcon } from "@/lib/categories";
import { isNew } from "@/lib/categories";
import { getPublicPartner } from "@/lib/partners.functions";

export const Route = createFileRoute("/_authenticated/parceiro/$slug")({
  loader: async ({ params }) => {
    const partner = await getPublicPartner({ data: { slug: params.slug } });
    if (!partner) throw notFound();
    return { partner };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [
          { title: "Parceiro não encontrado | Portal do Profissional Cronos" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const { partner } = loaderData;
    const title = `${partner.name} — ${partner.discount} | Portal do Profissional Cronos`;
    const description = partner.summary || partner.benefit_description;
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
  component: PartnerPage,
  errorComponent: () => <SimpleMessage title="Não conseguimos carregar este parceiro" />,
  notFoundComponent: () => <SimpleMessage title="Parceiro não encontrado" />,
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

function PartnerPage() {
  const { partner } = Route.useLoaderData();
  const category = partner.category_name
    ? { slug: partner.category, name: partner.category_name, icon: getIcon(partner.category_icon) }
    : null;
  const whatsappLink = partner.whatsapp
    ? `https://wa.me/55${partner.whatsapp.replace(/\D/g, "")}`
    : null;
  const instagramLink = partner.instagram
    ? `https://instagram.com/${partner.instagram.replace(/^@/, "")}`
    : null;

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="mx-auto max-w-4xl px-4 py-12">
        {category ? (
          <Link
            to="/categorias/$slug"
            params={{ slug: category.slug }}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            {category.name}
          </Link>
        ) : null}

        <header className="glass-card mt-8 rounded-3xl p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            <PartnerLogo name={partner.name} logoUrl={partner.logo_url} size="lg" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-3xl font-extrabold">{partner.name}</h1>
                {isNew(partner.created_at) ? (
                  <span className="gradient-gold rounded-full px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-wider text-accent-foreground">
                    Nova parceria
                  </span>
                ) : null}
              </div>
              {category ? (
                <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                  <category.icon className="h-4 w-4 text-accent" aria-hidden="true" />
                  {category.name}
                </p>
              ) : null}
              <p className="mt-4 font-display text-2xl font-bold text-gradient">
                {partner.discount}
              </p>
            </div>
          </div>
        </header>

        <div className="mt-6 grid gap-4">
          {partner.benefit_description ? (
            <Block title="Sobre o benefício">{partner.benefit_description}</Block>
          ) : null}
          {partner.how_to_use ? <Block title="Como utilizar">{partner.how_to_use}</Block> : null}
          {partner.rules ? <Block title="Regras e condições">{partner.rules}</Block> : null}

          {partner.address || partner.website || instagramLink || whatsappLink ? (
            <section className="glass-card rounded-2xl p-6">
              <h2 className="font-display text-base font-semibold text-accent">
                Onde encontrar
              </h2>
              <ul className="mt-3 grid gap-3 text-sm">
                {partner.address ? (
                  <li className="flex items-start gap-2.5 text-muted-foreground">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    {partner.address}
                  </li>
                ) : null}
                {partner.website ? (
                  <li className="flex items-start gap-2.5">
                    <Globe className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <a
                      href={partner.website}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="text-muted-foreground hover:text-foreground hover:underline"
                    >
                      {partner.website.replace(/^https?:\/\//, "")}
                    </a>
                  </li>
                ) : null}
                {instagramLink ? (
                  <li className="flex items-start gap-2.5">
                    <Instagram className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <a
                      href={instagramLink}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="text-muted-foreground hover:text-foreground hover:underline"
                    >
                      {partner.instagram}
                    </a>
                  </li>
                ) : null}
                {whatsappLink ? (
                  <li className="flex items-start gap-2.5">
                    <MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <a
                      href={whatsappLink}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="text-muted-foreground hover:text-foreground hover:underline"
                    >
                      {partner.whatsapp}
                    </a>
                  </li>
                ) : null}
              </ul>
            </section>
          ) : null}

          {partner.attachments.length > 0 ? (
            <section className="glass-card rounded-2xl p-6">
              <h2 className="font-display text-base font-semibold text-accent">
                Materiais e anexos
              </h2>
              <ul className="mt-3 grid gap-2">
                {partner.attachments.map((file) => (
                  <li key={file.id}>
                    <a
                      href={file.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="flex items-center gap-3 rounded-xl border border-border px-4 py-3 text-sm transition-colors hover:border-primary/60"
                    >
                      <FileText className="h-4 w-4 shrink-0 text-primary" />
                      <span className="min-w-0 flex-1 truncate">{file.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatBytes(file.size_bytes)}
                      </span>
                      <Download className="h-4 w-4 text-muted-foreground" />
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      </main>

      <Footer />
    </div>
  );
}
