import { createFileRoute } from "@tanstack/react-router";
import {
  BarChart3,
  Boxes,
  ChartNoAxesCombined,
  Cloud,
  ExternalLink,
  Info,
  LockKeyhole,
  Monitor,
  MonitorUp,
  Receipt,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SISTEMAS_CRONOS, type SistemaCronos } from "@/lib/acessos-sistemas";

export const Route = createFileRoute("/_authenticated/acessos-e-sistemas")({
  head: () => ({
    meta: [
      { title: "Acessos e Sistemas | Portal do Profissional Cronos" },
      { name: "description", content: "Guia rápido de acesso ao Skyline, Sólides, BI Explorer, Portal Office, Logcomex, Reembolso, Visualização QBr e Cronos Insights." },
      { property: "og:title", content: "Acessos e Sistemas | Portal do Profissional Cronos" },
      { property: "og:description", content: "Links dos sistemas e plataformas utilizados na Cronos Logistics." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AcessosSistemasPage,
});

const icones: Record<SistemaCronos["id"], LucideIcon> = {
  reembolso: Receipt,
  skyline: Cloud,
  solides: UsersRound,
  office: Monitor,
  "bi-explorer": BarChart3,
  logcomex: Boxes,
  "cronos-insights": ChartNoAxesCombined,
  "visualizacao-qbr": BarChart3,
};

const grupos = [
  {
    id: "corporativos",
    titulo: "Sistemas Corporativos",
    descricao: "Plataformas utilizadas no dia a dia da empresa.",
    icone: UsersRound,
  },
  {
    id: "especificos",
    titulo: "Sistemas com Acesso Específico",
    descricao: "O acesso depende das permissões concedidas em cada plataforma.",
    icone: LockKeyhole,
  },
] as const;

function CartaoSistema({ sistema }: { sistema: SistemaCronos }) {
  const Icon = icones[sistema.id];
  return (
    <article className="flex min-w-0 flex-col rounded-lg border border-border bg-card p-4">
      <div className="flex min-w-0 items-start gap-3">
        <Icon className="mt-0.5 size-7 shrink-0 text-primary" strokeWidth={1.8} aria-hidden="true" />
        <div className="min-w-0">
          <h3 className="break-words text-base font-bold text-foreground">{sistema.nome}</h3>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{sistema.descricao}</p>
          {"acesso" in sistema && <p className="mt-2 text-xs font-semibold text-secondary">{sistema.acesso}</p>}
        </div>
      </div>
      <div className="mt-auto flex justify-end pt-4">
        <Button asChild variant="link" size="sm" className="h-9 px-0 text-sm text-secondary">
          <a href={sistema.url} target="_blank" rel="noopener noreferrer" aria-label={`Abrir ${sistema.nome} em nova aba`}>
            Abrir <ExternalLink aria-hidden="true" />
          </a>
        </Button>
      </div>
    </article>
  );
}

function AcessosSistemasPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-2 py-8 sm:px-4 sm:py-10">
      <header className="mb-8 flex items-center gap-5 sm:gap-7">
        <MonitorUp className="hidden size-20 shrink-0 text-primary sm:block" strokeWidth={1.6} aria-hidden="true" />
        <div className="min-w-0 border-l-2 border-primary pl-5 sm:pl-7">
          <h1 className="font-bold text-foreground">Acessos e Sistemas</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">Sistemas e plataformas utilizados na Cronos Logistics.</p>
        </div>
      </header>

      <div className="space-y-6">
        {grupos.map(({ id, titulo, descricao, icone: Icon }) => (
          <section key={id} aria-labelledby={`grupo-${id}`} className="bg-primary/5 px-3 py-5 sm:px-5">
            <div className="mb-4 flex items-start gap-4 px-1">
              <Icon className="size-8 shrink-0 text-primary" strokeWidth={1.8} aria-hidden="true" />
              <div className="min-w-0">
                <h2 id={`grupo-${id}`} className="font-bold text-foreground">{titulo}</h2>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{descricao}</p>
              </div>
            </div>
            <div className="grid auto-rows-fr grid-cols-1 gap-3 sm:grid-cols-2 min-[60rem]:grid-cols-3">
              {SISTEMAS_CRONOS.filter((sistema) => sistema.grupo === id).map((sistema) => (
                <CartaoSistema key={sistema.id} sistema={sistema} />
              ))}
            </div>
          </section>
        ))}
      </div>

      <aside className="mt-6 flex items-start gap-3 border-l-2 border-secondary bg-primary/5 px-4 py-4 text-sm leading-relaxed text-foreground">
        <Info className="mt-0.5 size-5 shrink-0 text-secondary" aria-hidden="true" />
        <p><strong>Importante:</strong> Todos os atalhos estão disponíveis para consulta. O login em cada sistema depende das suas credenciais e permissões.</p>
      </aside>
    </main>
  );
}