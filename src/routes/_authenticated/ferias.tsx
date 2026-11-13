import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { RefreshCw, Search } from "lucide-react";
import { useState } from "react";
import { listarFeriasColaboradores } from "@/lib/ferias.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { TableHeadOrdenavel } from "@/components/ui/cabecalho-ordenavel";
import { useOrdenacaoTabela } from "@/hooks/useOrdenacaoTabela";

const feriasQuery = queryOptions({ queryKey: ["ferias-colaboradores"], queryFn: () => listarFeriasColaboradores(), staleTime: 60_000 });
export const Route = createFileRoute("/_authenticated/ferias")({
  loader: ({ context }) => context.queryClient.ensureQueryData(feriasQuery),
  pendingComponent: () => <p className="p-8 text-sm text-muted-foreground">Carregando férias…</p>,
  head: () => ({ meta: [
    { title: "Férias Programadas | Portal do Profissional Cronos" },
    { name: "description", content: "Consulta da programação de férias dos colaboradores ativos da Cronos Logistics." },
    { property: "og:title", content: "Férias Programadas | Portal do Profissional Cronos" },
    { property: "og:description", content: "Programação e datas de retorno dos colaboradores Cronos." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: FeriasPage,
});

function formatarData(data: string | null) {
  if (!data) return "-";
  return data.split("-").reverse().join("/");
}

type Coluna = "nome" | "status" | "inicio" | "fim" | "retorno" | "suplente";

function FeriasPage() {
  const q = useSuspenseQuery(feriasQuery);
  const [busca, setBusca] = useState("");
  const filtrados = q.data.itens.filter(item => item.nome.toLocaleLowerCase("pt-BR").includes(busca.trim().toLocaleLowerCase("pt-BR")));
  const { itens, ordenacao, alternar } = useOrdenacaoTabela(filtrados, {
    nome: (i) => i.nome,
    status: (i) => i.status,
    inicio: (i) => i.inicio,
    fim: (i) => i.fim,
    retorno: (i) => i.retorno,
    suplente: (i) => i.suplente,
  });
  return <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-8">
    <header className="mb-6 flex items-start justify-between gap-4">
      <h1 className="min-w-0 break-words text-3xl font-bold text-foreground">Férias Programadas</h1>
      <Button variant="outline" size="icon" className="shrink-0" title="Atualizar férias" aria-label="Atualizar férias" disabled={q.isFetching} onClick={() => void q.refetch()}><RefreshCw className={q.isFetching ? "animate-spin" : ""} /></Button>
    </header>
    {q.data.erro ? <p role="alert" className="border-l-2 border-destructive p-4 text-sm text-destructive">{q.data.erro}</p> : <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="relative w-full sm:max-w-sm"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input aria-label="Buscar colaborador" placeholder="Buscar colaborador" value={busca} onChange={e => setBusca(e.target.value)} className="pl-9" /></div>
        <span className="text-sm text-muted-foreground">{itens.length} {itens.length === 1 ? "registro" : "registros"}</span>
      </div>
      {itens.length === 0 ? <p role="status" className="py-12 text-center text-sm text-muted-foreground">{busca ? "Nenhum colaborador encontrado." : "Nenhuma programação de férias disponível no momento."}</p> :
        <Table>
          <TableHeader><TableRow>
            {([
              ["nome", "Nome"],
              ["status", "Status"],
              ["inicio", "Início"],
              ["fim", "Fim"],
              ["retorno", "Retorno"],
              ["suplente", "Suplente"],
            ] as const).map(([coluna, rotulo]) => (
              <TableHeadOrdenavel key={coluna} coluna={coluna as Coluna} ordenacao={ordenacao} onOrdenar={alternar}>{rotulo}</TableHeadOrdenavel>
            ))}
          </TableRow></TableHeader>
          <TableBody>{itens.map(item => <TableRow key={item.id}>
            <TableCell className="min-w-48 font-semibold">{item.nome}</TableCell>
            <TableCell className="whitespace-nowrap">{item.status}</TableCell>
            <TableCell className="whitespace-nowrap">{formatarData(item.inicio)}</TableCell>
            <TableCell className="whitespace-nowrap">{formatarData(item.fim)}</TableCell>
            <TableCell className="whitespace-nowrap font-semibold">{formatarData(item.retorno)}</TableCell>
            <TableCell className="min-w-40">{item.suplente}</TableCell>
          </TableRow>)}</TableBody>
        </Table>}
    </>}
  </main>;
}
