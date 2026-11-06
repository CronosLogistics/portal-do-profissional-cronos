import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ExternalLink } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useCurrentUser } from "@/hooks/useAuth";
import { minhasPendencias, type ListasQualidade } from "@/lib/pendencias.functions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { minhasPendenciasPessoas } from "@/lib/pendencias-pessoas.functions";
import { LISTAS_PESSOAS, type TipoPendenciaPessoas, type PendenciaPessoas } from "@/lib/pendencias-pessoas.rules";
import type { PendenciaNC, PendenciaNPS, PendenciaRevisao } from "@/lib/pendencias.rules";
import { pendenciasKey, pendenciasPessoasKey } from "@/hooks/usePendencias";
import { temPendencias } from "@/lib/pendencias-visibility";

export const Route = createFileRoute("/_authenticated/pendencias")({
  head: () => ({
    meta: [
      { title: "Pendências | Portal do Profissional Cronos" },
      { name: "description", content: "Suas pendências na Cronos Logistics." },
      { property: "og:title", content: "Pendências | Portal do Profissional Cronos" },
      { property: "og:description", content: "Análises de NC e outras pendências sob sua responsabilidade." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PendenciasPage,
});

type Modo = "proprias" | "liderados";
const totalQualidade = (l?: ListasQualidade) => l ? l.analiseNC.length + l.analiseNCMaior.length + l.planoAcao.length + l.analiseSM.length + l.planoAcaoSM.length + l.nps.length + l.revisoes.length : 0;

function PendenciasPage() {
  const me = useCurrentUser();
  const buscarQ = useServerFn(minhasPendencias);
  const buscarP = useServerFn(minhasPendenciasPessoas);
  const q = useQuery({ queryKey: [...pendenciasKey, me.data?.id], queryFn: () => buscarQ(), enabled: !!me.data?.id, staleTime: 60_000 });
  // A aba de liderados só aparece para quem tem equipe vinculada no SharePoint.
  const lider = !!me.data?.can("pendencias.liderados") && q.data?.temLiderados === true;
  const p = useQuery({ queryKey: [...pendenciasPessoasKey, me.data?.id], queryFn: () => buscarP(), enabled: !!me.data?.id, staleTime: 60_000 });
  const tipos = Object.keys(LISTAS_PESSOAS) as TipoPendenciaPessoas[];
  const total = (modo: Modo) => totalQualidade(q.data?.[modo]) + tipos.reduce((s, t) => s + ((modo === "proprias" ? p.data?.listas : p.data?.liderados)?.[t]?.length ?? 0), 0);

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">Pendências</h1>
        <p className="mt-1 text-sm text-muted-foreground">Itens que aguardam sua resposta.</p>
      </header>
      {lider ? (
        <Tabs defaultValue="proprias">
          <TabsList className="mb-4">
            <TabsTrigger value="proprias">Minhas pendências ({total("proprias")})</TabsTrigger>
            <TabsTrigger value="liderados">Pendências dos liderados ({total("liderados")})</TabsTrigger>
          </TabsList>
          <TabsContent value="proprias"><Conteudo modo="proprias" /></TabsContent>
          <TabsContent value="liderados"><Conteudo modo="liderados" /></TabsContent>
        </Tabs>
      ) : <Conteudo modo="proprias" />}
    </main>
  );
}

function Conteudo({ modo }: { modo: Modo }) {
  const me = useCurrentUser();
  const buscar = useServerFn(minhasPendencias);
  const q = useQuery({ queryKey: [...pendenciasKey, me.data?.id], queryFn: () => buscar(), enabled: !!me.data?.id, staleTime: 60_000 });
  const l = q.data?.[modo];
  const analise = l?.analiseNC ?? [];
  const maior = l?.analiseNCMaior ?? [];
  const plano = l?.planoAcao ?? [];
  const sm = l?.analiseSM ?? [];
  const planoSM = l?.planoAcaoSM ?? [];
  const nps = l?.nps ?? [];
  const revisoes = l?.revisoes ?? [];

  return (
    <>
      {q.isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
      {q.error && <p className="rounded-lg border border-destructive/40 bg-card p-4 text-sm text-destructive">{q.error.message}</p>}
      {q.data?.erro && <p className="rounded-lg border border-destructive/40 bg-card p-4 text-sm text-destructive">{q.data.erro}</p>}
      <div className="space-y-6">
        {q.data && (
          <>
            <Grupo titulo="Satisfação do cliente" totais={[nps.length]}>
              <Accordion type="multiple" className="rounded-lg border bg-card">
                <Secao valor="nps" titulo="Satisfação do cliente" total={nps.length} ultimo><ListaNPS itens={nps} /></Secao>
              </Accordion>
            </Grupo>

            <Grupo titulo="RQ-00-01 - Controle de informação documentada" totais={[revisoes.length]}>
              <Accordion type="multiple" className="rounded-lg border bg-card">
                <Secao valor="revisao-documentos" titulo="Revisão de documentos" total={revisoes.length} ultimo>
                  <ListaRevisoes itens={revisoes} />
                </Secao>
              </Accordion>
            </Grupo>

            <Grupo titulo="RQ-00-02 - NC" totais={[analise.length, maior.length, plano.length]}>
              <Accordion type="multiple" className="rounded-lg border bg-card [&>div:last-child]:border-b-0">
                <Secao valor="analise-nc" titulo="Análise" total={analise.length}>
                  <ListaNC itens={analise} />
                </Secao>
                <Secao valor="analise-nc-maior" titulo="Análise Maior" total={maior.length}>
                  <ListaNC itens={maior} vazio="Nenhuma análise de NC maior pendente para você." />
                </Secao>
                <Secao valor="plano-acao" titulo="Plano de Ação" total={plano.length} ultimo>
                  <ListaNC itens={plano} vazio="Nenhum plano de ação pendente para você." colunaDias="Dias em atraso" />
                </Secao>
              </Accordion>
            </Grupo>

            <Grupo titulo="RQ-00-13 - SM e EL" totais={[sm.length, planoSM.length]}>
              <Accordion type="multiple" className="rounded-lg border bg-card [&>div:last-child]:border-b-0">
                <Secao valor="analise-sm" titulo="Análise" total={sm.length}>
                  <ListaNC itens={sm} rotulo="SM" vazio="Nenhuma análise de SM pendente para você." />
                </Secao>
                <Secao valor="plano-acao-sm" titulo="Plano de Ação" total={planoSM.length} ultimo>
                  <ListaNC itens={planoSM} rotulo="SM" vazio="Nenhum plano de ação de SM pendente para você." colunaDias="Dias em atraso" />
                </Secao>
              </Accordion>
            </Grupo>
          </>
        )}
        <PendenciasGestaoPessoas modo={modo} qualidadeVazia={q.isSuccess && !q.isFetching && !q.data.erro && !temPendencias(analise.length, maior.length, plano.length, sm.length, planoSM.length, nps.length, revisoes.length)} />
      </div>
    </>
  );
}

function PendenciasGestaoPessoas({ qualidadeVazia, modo }: { qualidadeVazia: boolean; modo: Modo }) {
  const buscar = useServerFn(minhasPendenciasPessoas);
  const me = useCurrentUser();
  const q = useQuery({ queryKey: [...pendenciasPessoasKey, me.data?.id], queryFn: () => buscar(), enabled: !!me.data?.id, staleTime: 60_000 });
  if (q.isLoading) return <p className="text-sm text-muted-foreground">Carregando…</p>;
  if (q.error) return <p className="rounded-lg border border-destructive/40 bg-card p-4 text-sm text-destructive">{q.error.message}</p>;
  const tipos = Object.keys(LISTAS_PESSOAS) as TipoPendenciaPessoas[];
  const listas = modo === "proprias" ? q.data?.listas : q.data?.liderados;
  const visiveis = tipos.filter(tipo => temPendencias(listas?.[tipo]?.length ?? 0));
  return <>
    {qualidadeVazia && q.isSuccess && !q.isFetching && !tipos.some(tipo => q.data.erros[tipo]) && visiveis.length === 0 && <p role="status" className="py-12 text-center text-sm text-muted-foreground">{modo === "proprias" ? "Você não tem pendências no momento." : "Seus liderados não têm pendências no momento."}</p>}
    {tipos.filter(tipo => q.data?.erros[tipo]).map(tipo => <p key={tipo} role="alert" className="py-4 text-sm text-destructive">{LISTAS_PESSOAS[tipo].titulo}: {q.data?.erros[tipo]}</p>)}
    {visiveis.length > 0 && <Accordion type="multiple" className="rounded-lg border bg-card">
      {visiveis.map((tipo, indice) => <Secao key={tipo} valor={tipo} titulo={LISTAS_PESSOAS[tipo].titulo} total={listas?.[tipo]?.length ?? 0} ultimo={indice === visiveis.length - 1}>
        <ListaPessoas tipo={tipo} itens={listas?.[tipo] ?? []} />
      </Secao>)}
    </Accordion>}
  </>;
}

function ListaPessoas({ tipo, itens }: { tipo: TipoPendenciaPessoas; itens: PendenciaPessoas[] }) {
  if (!itens.length) return <p className="py-4 text-center text-sm text-muted-foreground">Nenhuma pendência para você.</p>;
  const rq = tipo === "rq0244" || tipo === "rq0216";
  const data = (valor: string) => {
    const d = new Date(valor);
    return Number.isFinite(d.getTime()) ? d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "-";
  };
  const detalhe = tipo === "experiencia" ? "Ciclo Experiência" : tipo === "anexos" ? "Turma" : tipo === "rq0244" ? "Treinamento para" : tipo === "feedback" ? "Classificação" : "Status da aprovação";
  return <div className="overflow-x-auto"><table className="w-full text-sm">
    <thead className="text-left text-xs uppercase text-muted-foreground"><tr>
      <th className="py-2 pr-4">{tipo === "agendamento" || tipo === "anexos" ? "Treinamento" : "Profissional"}</th>
      {tipo !== "rq0216" && <th className="py-2 pr-4">{detalhe}</th>}
      <th className="py-2 pr-4">Status</th><th className="py-2 pr-4">{rq ? "Admissão" : tipo === "experiencia" ? "Data do agendamento" : tipo === "feedback" ? "Data do feedback" : "Data do treinamento"}</th>
      {rq && <><th className="py-2 pr-4">Prazo</th><th className="py-2 pr-4">Dias para finalizar</th></>}
      {tipo === "experiencia" && <th className="py-2 pr-4">Gestor Responsável</th>}
      {tipo !== "rq0216" && <th className="py-2 pr-4">{tipo === "feedback" ? "Autor" : "Responsável"}</th>}
      <th className="py-2"><span className="sr-only">Link para o item</span></th>
    </tr></thead><tbody>{itens.map(p => <tr key={p.id} className="border-t">
      <td className="py-2 pr-4 font-semibold text-foreground">{p.nome}</td>
      {tipo !== "rq0216" && <td className="py-2 pr-4">{p.detalhe}</td>}
      <td className="py-2 pr-4">{p.status}</td><td className="py-2 pr-4 whitespace-nowrap">{data(p.data)}</td>
      {rq && <><td className="py-2 pr-4 whitespace-nowrap">{data(p.prazo)}</td><td className={`py-2 pr-4 ${p.dias !== null && p.dias < 0 ? "font-semibold text-destructive" : "text-foreground"}`}>{p.dias ?? "-"}</td></>}
      {tipo === "experiencia" && <td className="py-2 pr-4">{p.gestor}</td>}
      {tipo !== "rq0216" && <td className="py-2 pr-4">{p.responsavel}</td>}
      <td className="py-2 text-right"><a href={p.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-primary hover:underline">Link para o item <ExternalLink className="h-3.5 w-3.5 shrink-0" /></a></td>
    </tr>)}</tbody>
  </table></div>;
}

function Grupo({ titulo, totais, children }: { titulo: string; totais: number[]; children?: React.ReactNode }) {
  if (!temPendencias(...totais)) return null;
  return (
    <section className="space-y-2">
      <h2 className="uppercase-tracked px-1 text-primary">{titulo}</h2>
      {children}
    </section>
  );
}

function Secao({ valor, titulo, total, ultimo, children }: { valor: string; titulo: string; total: number; ultimo?: boolean; children: React.ReactNode }) {
  if (!temPendencias(total)) return null;
  return (
    <AccordionItem value={valor} className={ultimo ? "border-b-0" : undefined}>
      <AccordionTrigger className="px-5 text-base font-semibold text-foreground hover:no-underline">
        <span className="flex items-center gap-2">{titulo} <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">{total}</span></span>
      </AccordionTrigger>
      <AccordionContent className="px-5">{children}</AccordionContent>
    </AccordionItem>
  );
}

function ListaRevisoes({ itens }: { itens: PendenciaRevisao[] }) {
  if (!itens.length) return <p className="py-4 text-center text-sm text-muted-foreground">Nenhuma revisão de documento pendente para você.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-left text-xs uppercase text-muted-foreground">
          <tr><th className="py-2 pr-4">Documento</th><th className="py-2 pr-4">Nº da revisão</th><th className="py-2 pr-4">Status da análise</th><th className="py-2 pr-4">Dias em atraso</th><th className="py-2 pr-4">Status da revisão</th><th className="py-2 pr-4">Dias em atraso do documento</th><th className="py-2 pr-4">Responsável</th><th className="py-2" /></tr>
        </thead>
        <tbody>{itens.map((p) => (
          <tr key={p.id} className="border-t">
            <td className="py-2 pr-4 font-semibold text-foreground">{p.documento}</td>
            <td className="py-2 pr-4">{p.revisao}</td>
            <td className="py-2 pr-4"><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${p.statusAnalise === "Vencido" ? "bg-destructive/10 text-destructive" : p.statusAnalise === "A vencer" ? "bg-accent text-accent-foreground" : "bg-secondary text-secondary-foreground"}`}>{p.statusAnalise}</span></td>
            <td className="py-2 pr-4">{p.diasAtrasoAnalise}</td>
            <td className="py-2 pr-4">{p.statusRevisao}</td>
            <td className="py-2 pr-4">{p.diasAtrasoDocumento}</td>
            <td className="py-2 pr-4">{p.responsavel}</td>
            <td className="py-2 text-right"><a href={p.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-primary hover:underline">Link para o item <ExternalLink className="h-3.5 w-3.5" /></a></td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}

function ListaNPS({ itens }: { itens: PendenciaNPS[] }) {
  if (itens.length === 0) return <p className="py-4 text-center text-sm text-muted-foreground">Nenhuma satisfação do cliente pendente para você.</p>;
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
              <td className="py-2 pr-4">{p.nota ?? "-"}</td>
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
