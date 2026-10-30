import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ExternalLink } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useCurrentUser } from "@/hooks/useAuth";
import { minhasPendencias } from "@/lib/pendencias.functions";
import type { PendenciaNC, PendenciaNPS } from "@/lib/pendencias.rules";

export const Route = createFileRoute("/_authenticated/pendencias")({
  head: () => ({
    meta: [
      { title: "Pendências prioritárias | Portal do Profissional Cronos" },
      { name: "description", content: "Suas pendências prioritárias por setor da Cronos Logistics." },
      { property: "og:title", content: "Pendências prioritárias | Portal do Profissional Cronos" },
      { property: "og:description", content: "Análises de NC e outras pendências sob sua responsabilidade." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PendenciasPage,
});

function PendenciasPage() {
  const me = useCurrentUser();
  const isAdmin = !!me.data?.isAdmin;
  const buscar = useServerFn(minhasPendencias);
  const q = useQuery({ queryKey: ["pendencias"], queryFn: () => buscar(), enabled: isAdmin });

  if (me.data && !isAdmin) {
    return <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-8"><p className="text-sm text-muted-foreground">Esta área ainda não está disponível.</p></main>;
  }
  const analise = q.data?.analiseNC ?? [];
  const maior = q.data?.analiseNCMaior ?? [];
  const plano = q.data?.planoAcao ?? [];
  const sm = q.data?.analiseSM ?? [];
  const planoSM = q.data?.planoAcaoSM ?? [];
  const nps = q.data?.nps ?? [];

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">Pendências</h1>
        <p className="mt-1 text-sm text-muted-foreground">Itens que aguardam sua resposta, separados por setor.</p>
      </header>
      <Tabs defaultValue="qualidade">
        <TabsList>
          <TabsTrigger value="qualidade">Qualidade</TabsTrigger>
        </TabsList>
        <TabsContent value="qualidade" className="mt-4">
          {q.isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
          {q.error && <p className="rounded-lg border border-destructive/40 bg-card p-4 text-sm text-destructive">{q.error.message}</p>}
          {q.data?.erro && <p className="rounded-lg border border-destructive/40 bg-card p-4 text-sm text-destructive">{q.data.erro}</p>}
          {q.data && (
            <Accordion type="multiple" className="rounded-lg border bg-card">
              <AccordionItem value="analise-nc">
                <AccordionTrigger className="px-5 text-base font-semibold text-foreground hover:no-underline">
                  <span className="flex items-center gap-2">Análise de NC <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">{analise.length}</span></span>
                </AccordionTrigger>
                <AccordionContent className="px-5"><ListaNC itens={analise} /></AccordionContent>
              </AccordionItem>
              <AccordionItem value="analise-nc-maior">
                <AccordionTrigger className="px-5 text-base font-semibold text-foreground hover:no-underline">
                  <span className="flex items-center gap-2">Análise de NC maior <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">{maior.length}</span></span>
                </AccordionTrigger>
                <AccordionContent className="px-5"><ListaNC itens={maior} vazio="Nenhuma análise de NC maior pendente para você." /></AccordionContent>
              </AccordionItem>
              <AccordionItem value="plano-acao">
                <AccordionTrigger className="px-5 text-base font-semibold text-foreground hover:no-underline">
                  <span className="flex items-center gap-2">Plano de ação <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">{plano.length}</span></span>
                </AccordionTrigger>
                <AccordionContent className="px-5"><ListaNC itens={plano} vazio="Nenhum plano de ação pendente para você." colunaDias="Dias em atraso" /></AccordionContent>
              </AccordionItem>
              <Secao valor="analise-sm" titulo="Análise de SM" total={sm.length}><ListaNC itens={sm} rotulo="SM" vazio="Nenhuma análise de SM pendente para você." /></Secao>
              <Secao valor="plano-acao-sm" titulo="Plano de ação SM" total={planoSM.length}><ListaNC itens={planoSM} rotulo="SM" vazio="Nenhum plano de ação de SM pendente para você." colunaDias="Dias em atraso" /></Secao>
              <Secao valor="nps" titulo="NPS" total={nps.length} ultimo><ListaNPS itens={nps} /></Secao>
            </Accordion>
          )}
        </TabsContent>
      </Tabs>
    </main>
  );
}

function Secao({ valor, titulo, total, ultimo, children }: { valor: string; titulo: string; total: number; ultimo?: boolean; children: React.ReactNode }) {
  return (
    <AccordionItem value={valor} className={ultimo ? "border-b-0" : undefined}>
      <AccordionTrigger className="px-5 text-base font-semibold text-foreground hover:no-underline">
        <span className="flex items-center gap-2">{titulo} <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">{total}</span></span>
      </AccordionTrigger>
      <AccordionContent className="px-5">{children}</AccordionContent>
    </AccordionItem>
  );
}

function ListaNPS({ itens }: { itens: PendenciaNPS[] }) {
  if (itens.length === 0) return <p className="py-4 text-center text-sm text-muted-foreground">Nenhum NPS pendente para você.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-left text-xs uppercase text-muted-foreground">
          <tr><th className="py-2 pr-4">Cliente</th><th className="py-2 pr-4">Processo</th><th className="py-2 pr-4">Nota</th><th className="py-2 pr-4">Status</th><th className="py-2" /></tr>
        </thead>
        <tbody>
          {itens.map((p) => (
            <tr key={p.id} className="border-t">
              <td className="py-2 pr-4 font-semibold text-foreground">{p.cliente}</td>
              <td className="py-2 pr-4">{p.processo}</td>
              <td className="py-2 pr-4">{p.nota ?? "—"}</td>
              <td className="py-2 pr-4"><span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold text-secondary-foreground">{p.status}</span></td>
              <td className="py-2 text-right">
                <a href={p.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-primary hover:underline">Link para o item <ExternalLink className="h-3.5 w-3.5" /></a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ListaNC({ itens, vazio = "Nenhuma análise de NC pendente para você.", colunaDias = "Nº de dias sem responder", rotulo = "NC" }: { itens: PendenciaNC[]; vazio?: string; colunaDias?: string; rotulo?: string }) {
  if (itens.length === 0) return <p className="py-4 text-center text-sm text-muted-foreground">{vazio}</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-left text-xs uppercase text-muted-foreground">
          <tr><th className="py-2 pr-4">{rotulo}</th><th className="py-2 pr-4">Status por tempo de resposta</th><th className="py-2 pr-4">{colunaDias}</th><th className="py-2 pr-4">Responsável</th><th className="py-2" /></tr>
        </thead>
        <tbody>
          {itens.map((p) => (
            <tr key={p.id} className="border-t">
              <td className="py-2 pr-4 font-semibold text-foreground">{p.nc}</td>
              <td className="py-2 pr-4">
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${p.status === "Vencido" ? "bg-destructive/10 text-destructive" : p.status === "A vencer" ? "bg-accent text-accent-foreground" : "bg-secondary text-secondary-foreground"}`}>{p.status}</span>
              </td>
              <td className="py-2 pr-4">{p.diasSemResposta}</td>
              <td className="py-2 pr-4">{p.responsavel}</td>
              <td className="py-2 text-right">
                <a href={p.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-primary hover:underline">Link para o item <ExternalLink className="h-3.5 w-3.5" /></a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
