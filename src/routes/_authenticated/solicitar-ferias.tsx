import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { CalendarDays, CalendarPlus, Info, RefreshCw } from "lucide-react";
import { useState } from "react";
import { minhasFerias, type MinhasFerias } from "@/lib/saldo-ferias.functions";
import { dataTermino, emailSolicitacao, formatarDataBr, opcoesDias, type PeriodoFerias } from "@/lib/saldo-ferias.rules";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const feriasQuery = queryOptions({ queryKey: ["minhas-ferias"], queryFn: () => minhasFerias(), staleTime: 60_000 });

export const Route = createFileRoute("/_authenticated/solicitar-ferias")({
  // Temporariamente restrita a administradores até a liberação geral.
  beforeLoad: async () => {
    const { data } = await supabase.rpc("minhas_permissoes");
    const perms = (data as string[] | null) ?? [];
    if (!perms.includes("admin.usuarios")) throw redirect({ to: "/" });
  },
  loader: ({ context }) => context.queryClient.ensureQueryData(feriasQuery),
  pendingComponent: () => <p className="p-8 text-sm text-muted-foreground">Carregando seus saldos de férias…</p>,
  head: () => ({ meta: [
    { title: "Solicitação de Férias | Portal do Profissional Cronos" },
    { name: "description", content: "Consulte seus períodos aquisitivos e solicite o agendamento de férias à Gestão de Pessoas." },
    { property: "og:title", content: "Solicitação de Férias | Portal do Profissional Cronos" },
    { property: "og:description", content: "Saldos de férias e solicitação de agendamento na Cronos Logistics." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: SolicitarFeriasPage,
});

function Situacao({ valor }: { valor: string }) {
  const v = valor.toLocaleLowerCase("pt-BR");
  const cor = v.includes("vencido") ? "bg-destructive/10 text-destructive" : v.includes("vencer") ? "bg-secondary/10 text-secondary" : "bg-primary/10 text-primary";
  return <span className={`inline-block whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${cor}`}>{valor || "-"}</span>;
}

function Metrica({ valor, rotulo, destaque }: { valor: number; rotulo: string; destaque?: boolean }) {
  return <div className="rounded-md border border-border bg-muted/40 p-3">
    <p className={`text-2xl font-bold leading-tight ${destaque ? "text-primary" : "text-foreground"}`}>{valor}</p>
    <p className="mt-1 text-xs text-muted-foreground">{rotulo}</p>
  </div>;
}

function CartaoPeriodo({ p, liberaEm, onSolicitar }: { p: PeriodoFerias; liberaEm: string | null; onSolicitar: () => void }) {
  return <article className="rounded-lg border border-border bg-card p-5">
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
      <div className="min-w-0">
        <h3 className="text-base font-bold text-foreground">Período {p.anoDireito} ({formatarDataBr(p.periodo)} a {formatarDataBr(p.dataDireito)})</h3>
        <p className="mt-1 text-xs text-muted-foreground">Limite para gozo: <strong>{formatarDataBr(p.limiteGozo)}</strong></p>
      </div>
      <Situacao valor={p.situacao} />
    </div>
    <div className="mb-5 grid grid-cols-3 gap-3">
      <Metrica valor={p.diasRestantes} rotulo="Dias disponíveis" destaque />
      <Metrica valor={p.diasGozados} rotulo="Dias gozados" />
      <Metrica valor={p.diasConcedidos} rotulo="Dias concedidos" />
    </div>
    {liberaEm
      ? <Button className="w-full" disabled title="Férias disponíveis após 1 ano de empresa (CLT)"><CalendarPlus aria-hidden="true" /> Disponível a partir de {formatarDataBr(liberaEm)}</Button>
      : <Button className="w-full" onClick={onSolicitar}><CalendarPlus aria-hidden="true" /> Solicitar férias</Button>}
  </article>;
}

function ModalSolicitacao({ periodo, dados, onClose }: { periodo: PeriodoFerias; dados: MinhasFerias; onClose: () => void }) {
  const opcoes = opcoesDias(periodo.diasRestantes);
  const [inicio, setInicio] = useState("");
  const [dias, setDias] = useState(opcoes[0] ?? 0);
  const [abono, setAbono] = useState(false);
  const [obs, setObs] = useState("");
  const termino = inicio ? dataTermino(inicio, dias) : null;
  const permiteAbono = /clt/i.test(periodo.regime);

  function continuar(e: React.FormEvent) {
    e.preventDefault();
    if (!inicio || !dias) return;
    const { mailto } = emailSolicitacao({
      nome: dados.nome, departamento: dados.departamento, gestor: dados.gestor,
      anoDireito: periodo.anoDireito, inicio, dias, saldo: periodo.diasRestantes,
      abono: permiteAbono && abono, observacoes: obs,
    });
    onClose();
    window.location.href = mailto;
  }

  return <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
    <DialogContent className="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>Solicitar Férias</DialogTitle>
        <DialogDescription>O Outlook será aberto com o e-mail para a Gestão de Pessoas já preenchido.</DialogDescription>
      </DialogHeader>
      <form onSubmit={continuar} className="space-y-4">
        <div className="space-y-1.5">
          <Label>Período Aquisitivo Selecionado</Label>
          <Input readOnly value={`${periodo.anoDireito} (${formatarDataBr(periodo.periodo)} - ${formatarDataBr(periodo.dataDireito)})`} className="bg-muted text-muted-foreground" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="inicio-ferias">Data de Início *</Label>
            <Input id="inicio-ferias" type="date" required value={inicio} onChange={(e) => setInicio(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dias-ferias">Quantidade de Dias *</Label>
            <select id="dias-ferias" required value={dias} onChange={(e) => setDias(Number(e.target.value))}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              {opcoes.map((d) => <option key={d} value={d}>{d} dias</option>)}
            </select>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Previsão de Retorno / Término</Label>
          <Input readOnly value={termino ? `Último dia de férias: ${formatarDataBr(termino)}` : ""} placeholder="Selecione a data de início" className="bg-muted text-muted-foreground" />
        </div>
        {permiteAbono && <label className="flex cursor-pointer items-center gap-2 text-sm">
          <Checkbox checked={abono} onCheckedChange={(v) => setAbono(v === true)} />
          Desejo solicitar abono pecuniário (venda de 1/3 das férias)
        </label>}
        <div className="space-y-1.5">
          <Label htmlFor="obs-ferias">Observações (opcional)</Label>
          <Textarea id="obs-ferias" rows={2} maxLength={500} value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Ex: Alinhado previamente com o gestor..." />
        </div>
        <DialogFooter className="gap-2 border-t border-border pt-4">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={!inicio || !dias}>Continuar para E-mail</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>;
}

function SolicitarFeriasPage() {
  const q = useSuspenseQuery(feriasQuery);
  const [selecionado, setSelecionado] = useState<PeriodoFerias | null>(null);
  const abertos = q.data.periodos.filter((p) => p.podeSolicitar);
  const historico = q.data.periodos.filter((p) => !p.podeSolicitar);
  const { carencia } = q.data;
  const bloqueio = carencia.bloqueado ? carencia.liberaEm : null;

  return <main className="mx-auto w-full max-w-6xl px-2 py-8 sm:px-4 sm:py-10">
    <header className="mb-8 flex items-start justify-between gap-4">
      <div className="flex min-w-0 items-center gap-5">
        <CalendarDays className="hidden size-16 shrink-0 text-primary sm:block" strokeWidth={1.6} aria-hidden="true" />
        <div className="min-w-0 border-l-2 border-primary pl-5">
          <h1 className="font-bold text-foreground">Solicitação de Férias</h1>
          <p className="mt-2 text-sm text-muted-foreground">Acompanhe seus períodos aquisitivos e solicite o agendamento à Gestão de Pessoas.</p>
        </div>
      </div>
      <Button variant="outline" size="icon" className="shrink-0" title="Atualizar" aria-label="Atualizar saldos" disabled={q.isFetching} onClick={() => void q.refetch()}>
        <RefreshCw className={q.isFetching ? "animate-spin" : ""} />
      </Button>
    </header>

    {q.data.erro ? <p role="alert" className="border-l-2 border-destructive p-4 text-sm text-destructive">{q.data.erro}</p> : <>
      <section aria-labelledby="abertos" className="mb-10">
        <h2 id="abertos" className="mb-4 border-l-4 border-primary pl-2 text-lg font-bold text-foreground">Períodos em aberto</h2>
        {bloqueio && <div role="alert" className="mb-4 flex gap-3 rounded-lg border border-secondary/30 bg-secondary/5 p-4 text-sm text-foreground">
          <Info className="mt-0.5 size-5 shrink-0 text-secondary" aria-hidden="true" />
          <div>
            <p className="font-semibold text-secondary">Você ainda não pode solicitar férias</p>
            <p className="mt-1 text-muted-foreground">Pela CLT, as férias só podem ser solicitadas depois de 12 meses de empresa (período aquisitivo completo). Sua admissão foi em <strong className="text-foreground">{formatarDataBr(carencia.admissao)}</strong>, então a solicitação fica disponível a partir de <strong className="text-foreground">{formatarDataBr(bloqueio)}</strong>.</p>
          </div>
        </div>}
        {abertos.length === 0
          ? bloqueio ? null : <p role="status" className="text-sm text-muted-foreground">Nenhum período de férias disponível para solicitação no momento.</p>
          : <div className="grid gap-4 lg:grid-cols-2">{abertos.map((p) => <CartaoPeriodo key={p.id} p={p} liberaEm={bloqueio} onSolicitar={() => setSelecionado(p)} />)}</div>}
      </section>

      <section aria-labelledby="historico">
        <h2 id="historico" className="mb-4 border-l-4 border-primary pl-2 text-lg font-bold text-foreground">Histórico de férias</h2>
        {historico.length === 0
          ? <p role="status" className="text-sm text-muted-foreground">Nenhum histórico encontrado.</p>
          : <div className="overflow-x-auto rounded-lg border border-border bg-card"><Table>
            <TableHeader><TableRow>
              {["Status", "Situação", "Ano Direito", "Dias Concedidos", "Dias Gozados", "Dias Restantes", "Período", "Data de Direito", "Limite do Gozo"].map((c) => <TableHead key={c} className="whitespace-nowrap">{c}</TableHead>)}
            </TableRow></TableHeader>
            <TableBody>{historico.map((p) => <TableRow key={p.id}>
              <TableCell className="whitespace-nowrap">{p.status || "-"}</TableCell>
              <TableCell><Situacao valor={p.situacao} /></TableCell>
              <TableCell className="font-semibold">{p.anoDireito || "-"}</TableCell>
              <TableCell>{p.diasConcedidos}</TableCell>
              <TableCell>{p.diasGozados}</TableCell>
              <TableCell>{p.diasRestantes}</TableCell>
              <TableCell className="whitespace-nowrap">{formatarDataBr(p.periodo)}</TableCell>
              <TableCell className="whitespace-nowrap">{formatarDataBr(p.dataDireito)}</TableCell>
              <TableCell className="whitespace-nowrap">{formatarDataBr(p.limiteGozo)}</TableCell>
            </TableRow>)}</TableBody>
          </Table></div>}
      </section>
    </>}
    {selecionado && !bloqueio && <ModalSolicitacao periodo={selecionado} dados={q.data} onClose={() => setSelecionado(null)} />}
  </main>;
}
