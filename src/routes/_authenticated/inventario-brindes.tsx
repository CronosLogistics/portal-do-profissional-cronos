import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useState } from "react";
import { listarInventarios } from "@/lib/inventario.functions";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const inventariosQuery = queryOptions({ queryKey: ["inventarios-brindes"], queryFn: () => listarInventarios(), staleTime: 60_000 });

export const Route = createFileRoute("/_authenticated/inventario-brindes")({
  loader: ({ context }) => context.queryClient.ensureQueryData(inventariosQuery),
  pendingComponent: () => <p className="p-8 text-sm text-muted-foreground">Carregando inventários…</p>,
  errorComponent: () => <p className="p-8 text-sm text-muted-foreground">Você não tem acesso ao Inventário de Brindes ou ele está indisponível no momento.</p>,
  head: () => ({ meta: [
    { title: "Inventário de Brindes (Comercial) | Portal do Profissional Cronos" },
    { name: "description", content: "Consulta dos inventários de brindes dos escritórios comerciais da Cronos Logistics." },
    { property: "og:title", content: "Inventário de Brindes (Comercial) | Portal do Profissional Cronos" },
    { property: "og:description", content: "Saldos de brindes por escritório, direto do SharePoint." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: InventarioPage,
});

function InventarioPage() {
  const { inventarios } = useSuspenseQuery(inventariosQuery).data;
  const [ativo, setAtivo] = useState(inventarios[0]?.id ?? "");
  const [busca, setBusca] = useState("");
  const inv = inventarios.find((i) => i.id === ativo) ?? inventarios[0];
  const normalizar = (valor: string) => valor.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLocaleLowerCase("pt-BR");
  const ehVitoria = normalizar(`${inv?.titulo ?? ""} ${inv?.escritorio ?? ""}`).includes("vitoria");
  const colunas = (inv?.colunas ?? []).filter((c) => !ehVitoria || !["data da aprovacao", "data de aprovacao", "estorno"].includes(normalizar(c.titulo)));
  const termo = busca.trim().toLocaleLowerCase("pt-BR");
  const linhas = (inv?.linhas ?? []).filter((l) => !termo || Object.values(l).some((v) => v.toLocaleLowerCase("pt-BR").includes(termo)));
  return (
    <div className="space-y-5 p-4 md:p-8">
      <div>
        <h1 className="text-2xl font-bold text-primary">Inventário de Brindes (Comercial)</h1>
        <p className="text-sm text-muted-foreground">Consulta dos saldos registrados no SharePoint. Alterações devem ser feitas nas listas originais.</p>
      </div>
      {inventarios.length > 1 && (
        <div className="flex flex-wrap gap-2" role="tablist">
          {inventarios.map((i) => (
            <button key={i.id} role="tab" aria-selected={i.id === inv?.id} onClick={() => setAtivo(i.id)}
              className={`rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${i.id === inv?.id ? "border-accent bg-accent text-accent-foreground" : "border-border bg-card text-foreground hover:bg-muted"}`}>
              {i.titulo}{i.escritorio ? ` · ${i.escritorio}` : ""}
            </button>
          ))}
        </div>
      )}
      {inv && (
        <section className="rounded-lg border bg-card">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
            <div>
              <h2 className="font-semibold text-secondary">{inv.titulo}</h2>
              {inv.escritorio && <p className="text-xs text-muted-foreground">{inv.escritorio} · {inv.linhas.length} itens</p>}
            </div>
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar item" className="pl-8" />
            </div>
          </div>
          {inv.erro ? <p className="p-4 text-sm text-destructive">{inv.erro}</p> : (
            <Table>
              <TableHeader><TableRow>{colunas.map((c) => <TableHead key={c.nome} className={c.tipo === "texto" ? "" : "text-right"}>{c.titulo}</TableHead>)}</TableRow></TableHeader>
              <TableBody>
                {linhas.length === 0 ? <TableRow><TableCell colSpan={colunas.length || 1} className="text-center text-muted-foreground">Nenhum item encontrado.</TableCell></TableRow>
                  : linhas.map((l, n) => (
                    <TableRow key={n}>{colunas.map((c) => <TableCell key={c.nome} className={c.tipo === "texto" ? "" : "text-right tabular-nums"}>{l[c.nome] || "-"}</TableCell>)}</TableRow>
                  ))}
              </TableBody>
            </Table>
          )}
        </section>
      )}
    </div>
  );
}
