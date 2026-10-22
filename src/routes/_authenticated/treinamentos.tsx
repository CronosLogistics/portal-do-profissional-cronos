import { createFileRoute } from "@tanstack/react-router";
import { CalendarCheck, CheckCircle2, ExternalLink, GanttChartSquare, GraduationCap, Trophy } from "lucide-react";

import { Navbar } from "@/components/clube/Navbar";
import { Footer } from "@/components/clube/Footer";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CERTIFICADOS, LINKS, PONTUACAO, STEPS } from "@/components/treinamentos/content";

export const Route = createFileRoute("/_authenticated/treinamentos")({
  head: () => ({
    meta: [
      { title: "Treinamentos | Portal do Profissional Cronos" },
      {
        name: "description",
        content: "Cadastro e gestão de treinamentos, diplomas, certificados e gamificação da Cronos Logistics.",
      },
      { property: "og:title", content: "Treinamentos | Portal do Profissional Cronos" },
      { property: "og:description", content: "O guia oficial da Cronos Logistics para capacitar nosso time." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TreinamentosPage,
});

function External({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer">
      {children}
    </a>
  );
}

function TreinamentosPage() {
  return (
    <div className="min-h-screen">
      <Navbar />

      <section className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="font-display font-bold">Treinamentos</h1>
        <p className="mt-2 text-sm text-muted-foreground">Diplomas, certificados e solicitações de treinamento.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild><External href={LINKS.diplomasCertificados}><GraduationCap /> Cadastrar diploma ou certificado</External></Button>
          <Button asChild variant="outline"><External href={LINKS.cadastroTreinamento}><GanttChartSquare /> Cadastrar treinamento</External></Button>
          <Button asChild variant="outline"><External href={LINKS.agendamentoDireto}><CalendarCheck /> Agendar existente</External></Button>
        </div>
      </section>

      {/* Diplomas e certificados */}
      <section id="cadastros-cursos" className="scroll-mt-20 border-t border-border/60 py-10">
        <div className="mx-auto max-w-6xl px-4">
          <p className="uppercase-tracked mb-3 text-primary">Diplomas e Certificados</p>
          <h2 className="mb-3 font-display text-2xl font-bold">
            Diplomas & <span className="text-gradient">Certificados</span>
          </h2>
          <p className="mb-6 text-sm text-muted-foreground">Registre pós-graduação, certificações e/ou cursos concluídos.</p>
          <div className="mb-10 grid gap-5 md:grid-cols-2">
            {CERTIFICADOS.map(({ icon: Icon, title, description }) => (
              <div key={title} className="glass-card rounded-2xl p-6 md:p-8">
                <span className="mb-5 flex h-12 w-12 items-center justify-center rounded-lg border border-primary/30 bg-primary/15">
                  <Icon className="h-6 w-6 text-primary" />
                </span>
                <h3 className="mb-2 font-display text-xl font-bold">{title}</h3>
                <p className="text-muted-foreground">{description}</p>
              </div>
            ))}
          </div>
          <Button asChild size="lg">
            <External href={LINKS.diplomasCertificados}>
              Acessar formulário <ExternalLink className="ml-1 h-4 w-4" />
            </External>
          </Button>
        </div>
      </section>

      {/* Gamificação */}
      <section id="gamificacao" className="scroll-mt-20 border-t border-border/60 py-10">
        <div className="mx-auto max-w-4xl px-4">
          <p className="uppercase-tracked mb-3 text-primary">Gamificação</p>
          <h2 className="mb-3 font-display text-2xl font-bold">
            Entenda como a sua participação em treinamentos e cursos <span className="text-gradient">geram pontos</span> para você
          </h2>
          <p className="mb-8 text-lg text-muted-foreground">
            A pontuação varia conforme a classificação da capacitação. Confira abaixo os valores atuais aplicados pela Gestão de Pessoas.
          </p>
          <div className="glass-card overflow-hidden rounded-2xl">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="uppercase-tracked px-6 py-4">Classificação da capacitação</TableHead>
                  <TableHead className="uppercase-tracked px-6 py-4 text-right">Pontuação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {PONTUACAO.map((row) => (
                  <TableRow key={row.categoria}>
                    <TableCell className="px-6 py-4 text-base font-medium">{row.categoria}</TableCell>
                    <TableCell className="px-6 py-4 text-right">
                      <span className="gradient-primary inline-flex min-w-[72px] justify-center rounded-full px-4 py-1.5 text-sm font-bold text-primary-foreground">
                        {row.pontos} pts
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            *Demais categorias de treinamento, como Mudança de Função, Onboarding, Intradepartamental, Campanhas e outras capacitações obrigatórias, não geram pontuação na gamificação.
          </p>
        </div>
      </section>

      {/* Passo a passo */}
      <section id="processo" className="scroll-mt-20 border-t border-border/60 py-10">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mb-14 max-w-3xl">
            <p className="uppercase-tracked mb-3 text-primary">
              O passo a passo para <span className="font-black">líderes</span> cadastrarem treinamentos
            </p>
            <h2 className="mb-3 font-display text-2xl font-bold">
              Cadastro de <span className="text-gradient">treinamentos</span>
            </h2>
            <p className="mb-4 text-lg text-muted-foreground">
              Seis etapas para garantir uma jornada de desenvolvimento ágil e orientada à excelência.
            </p>
            <span className="mb-4 inline-flex rounded-full border border-secondary bg-secondary/25 px-4 py-1.5 text-xs font-bold uppercase tracking-wider">
              Apenas para liderança
            </span>
            <p className="text-muted-foreground">
              Os profissionais interessados em ministrar um treinamento devem solicitar a aprovação do líder, que será responsável por realizar o cadastro.
            </p>
          </div>

          <ol className="relative space-y-12 md:space-y-20">
            <div aria-hidden className="dotted-line absolute bottom-0 left-6 top-0 w-px opacity-60 md:left-1/2" />
            {STEPS.map((step, idx) => {
              const Icon = step.icon;
              const right = idx % 2 === 1;
              return (
                <li key={step.num} className="relative grid items-center gap-6 md:grid-cols-2 md:gap-12">
                  <span aria-hidden className="absolute left-6 top-8 z-10 h-3.5 w-3.5 -translate-x-1/2 rounded-full bg-primary ring-4 ring-background md:left-1/2 md:top-1/2" />
                  <div className={`pl-14 md:pl-0 ${right ? "md:order-2 md:pl-12" : "md:pr-12"}`}>
                    <div className="glass-card rounded-2xl p-6 md:p-8">
                      <div className="mb-4 flex items-start gap-4">
                        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-primary/30 bg-primary/15">
                          <Icon className="h-5 w-5 text-primary" />
                        </span>
                        <div>
                          <p className="uppercase-tracked text-muted-foreground">Etapa {step.num}</p>
                          <h3 className="mt-1 font-display text-xl font-bold leading-tight md:text-2xl">{step.title}</h3>
                        </div>
                      </div>
                      <p className="mb-4 text-muted-foreground">{step.description}</p>
                      {step.bullets ? (
                        <ul className="mb-4 space-y-2">
                          {step.bullets.map((b) => (
                            <li key={b} className="flex items-center gap-2 text-sm">
                              <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" /> {b}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                      <div className="flex flex-wrap items-center gap-3">
                        {step.cta ? (
                          <Button asChild size="sm">
                            <External href={step.cta.href}>
                              {step.cta.label} <ExternalLink className="ml-1 h-3.5 w-3.5" />
                            </External>
                          </Button>
                        ) : null}
                        {step.badge ? (
                          <span className="rounded-full border border-secondary bg-secondary/25 px-3 py-1 text-xs font-medium">{step.badge}</span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  <div className={`pl-14 md:pl-0 ${right ? "md:pr-12" : "md:pl-12"}`}>
                    {step.image ? (
                      <figure className="glass-card rounded-2xl p-2">
                        <img src={step.image} alt={step.imageAlt ?? ""} loading="lazy" className="h-auto w-full rounded-xl" />
                        <figcaption className="uppercase-tracked py-2 text-center text-muted-foreground">
                          Pré-visualização do e-mail
                        </figcaption>
                      </figure>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      <Footer />
    </div>
  );
}
