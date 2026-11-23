import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { useState } from "react";
import { listarInventarios } from "@/lib/inventario.functions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const inventariosQuery = queryOptions({ queryKey: ["inventarios-brindes"], queryFn: () => listarInventarios(), staleTime: 60_000 });
const tituloComercial = (titulo: string) => titulo.replace(/\bCOMERCIAL\b/g, "Comercial");

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
  const [seletorAberto, setSeletorAberto] = useState(false);
  const inv = inventarios.find((i) => i.id === ativo) ?? inventarios[0];
  const normalizar = (valor: string) => valor.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLocaleLowerCase("pt-BR");
  const ehVitoria = normalizar(`${inv?.titulo ?? ""} ${inv?.escritorio ?? ""}`).includes("vitoria");
  const colunas = (inv?.colunas ?? []).filter((c) => !ehVitoria || !["data da aprovacao", "data de aprovacao", "estorno"].includes(normalizar(c.titulo)));
  const termo = busca.trim().toLocaleLowerCase("pt-BR");
  const linhas = (inv?.linhas ?? []).filter((l) => !termo || colunas.some((c) => (l[c.nome] ?? "").toLocaleLowerCase("pt-BR").includes(termo)));
  return (
    <div className="space-y-5 p-4 md:p-8">
      <div>
        <h1 className="text-2xl font-bold text-primary">Inventário de Brindes (Comercial)</h1>
        <p className="text-sm text-muted-foreground">Consulta dos saldos registrados no SharePoint. Alterações devem ser feitas nas listas originais.</p>
      </div>
      {inv && (
        <section className="rounded-lg border bg-card">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
            <div>
              <h2 className="font-semibold text-secondary">{tituloComercial(inv.titulo)}</h2>
              {inv.escritorio && <p className="text-xs text-muted-foreground">{inv.escritorio} · {inv.linhas.length} itens</p>}
            </div>
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
              {inventarios.length > 1 && (
                <Popover open={seletorAberto} onOpenChange={setSeletorAberto}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" aria-expanded={seletorAberto} aria-label="Selecionar escritório" className="w-full justify-between sm:w-64">
                      <span className="min-w-0 truncate">{tituloComercial(inv.titulo)}{inv.escritorio ? ` · ${inv.escritorio}` : ""}</span>
                      <ChevronsUpDown className="text-muted-foreground" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] p-0">
                    <Command>
                      <CommandInput placeholder="Buscar escritório…" aria-label="Buscar escritório" />
                      <CommandList>
                        <CommandEmpty>Nenhum escritório encontrado.</CommandEmpty>
                        <CommandGroup>
                          {inventarios.map((i) => (
                            <CommandItem key={i.id} value={i.id} keywords={[i.titulo, i.escritorio]} onSelect={() => { setAtivo(i.id); setBusca(""); setSeletorAberto(false); }}>
                              <span className="min-w-0 flex-1 break-words">{tituloComercial(i.titulo)}{i.escritorio ? ` · ${i.escritorio}` : ""}</span>
                              {i.id === inv.id && <Check className="text-secondary" />}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              )}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar item" className="pl-8" />
            </div>
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
