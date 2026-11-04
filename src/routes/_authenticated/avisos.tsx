import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, CheckCheck, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useCurrentUser } from "@/hooks/useAuth";
import { useNaoLidos } from "@/hooks/useAvisos";
import { AvisoLeitura, type AvisoExibido } from "@/components/avisos/AvisoLeitura";
import { AvisoForm } from "@/components/avisos/AvisoForm";
import { AvisoAcompanhamento } from "@/components/avisos/AvisoAcompanhamento";
import { InsiderEditor } from "@/components/avisos/InsiderEditor";
import { arquivarAviso, avisosEnviados, avisosKey, cancelarAviso, listarAvisos, marcarTodosLidos, POR_PAGINA, type AvisoEnviado } from "@/lib/avisos-client";
import { filtrarAvisosPorBusca, formatarDataBrasilia, statusAviso, type StatusAviso } from "@/lib/avisos-rules";

export const Route = createFileRoute("/_authenticated/avisos")({
  validateSearch: (s: Record<string, unknown>): { aviso?: string } => (typeof s["aviso"] === "string" ? { aviso: s["aviso"] } : {}),
  head: () => ({
    meta: [
      { title: "Avisos | Portal do Profissional Cronos" },
      { name: "description", content: "Central de avisos oficiais da Cronos Logistics para os profissionais." },
      { property: "og:title", content: "Avisos | Portal do Profissional Cronos" },
      { property: "og:description", content: "Comunicados da Cronos para todos os profissionais." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AvisosPage,
});

function AvisosPage() {
  const me = useCurrentUser();
  const podePublicar = Boolean(me.data?.can("avisos.publicar") || me.data?.can("avisos.gerenciar") || me.data?.can("avisos.confirmacao"));
  const [form, setForm] = useState<{ open: boolean; aviso?: AvisoEnviado | null }>({ open: false });
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Avisos</h1>
          <p className="text-muted-foreground">Comunicados oficiais para todos os profissionais.</p>
        </div>
        {(me.data?.can("avisos.publicar") || me.data?.can("avisos.confirmacao")) && <Button onClick={() => setForm({ open: true, aviso: null })}><Plus />Novo aviso</Button>}
      </header>
      {podePublicar || me.data?.can("avisos.insider") ? (
        <Tabs defaultValue="recebidos">
          <TabsList>
            <TabsTrigger value="recebidos">Recebidos</TabsTrigger>
            {podePublicar && <TabsTrigger value="enviados">Enviados</TabsTrigger>}
            {me.data?.can("avisos.insider") && <TabsTrigger value="insider">Cronos Insider</TabsTrigger>}
          </TabsList>
          <TabsContent value="recebidos"><Recebidos /></TabsContent>
          <TabsContent value="enviados"><Enviados onEdit={(a) => setForm({ open: true, aviso: a })} /></TabsContent>
          {me.data?.can("avisos.insider") && <TabsContent value="insider"><InsiderEditor /></TabsContent>}
        </Tabs>
      ) : (
        <Recebidos />
      )}
      <AvisoForm open={form.open} aviso={form.aviso ?? null} onClose={() => setForm({ open: false })} />
    </main>
  );
}

function Recebidos() {
  const qc = useQueryClient();
  const navigate = useNavigate({ from: "/avisos" });
  const { aviso: abertoId } = Route.useSearch();
  const [filtro, setFiltro] = useState<"todos" | "nao-lidos" | "obrigatorios">("todos");
  const [busca, setBusca] = useState("");
  const naoLidos = useNaoLidos();
  const lista = useInfiniteQuery({
    queryKey: [...avisosKey, "lista", filtro],
    queryFn: ({ pageParam }) => listarAvisos(filtro === "nao-lidos", POR_PAGINA, pageParam, filtro === "obrigatorios"),
    initialPageParam: 0,
    getNextPageParam: (last, pages) => (last.length < POR_PAGINA ? undefined : pages.length * POR_PAGINA),
  });
  const avisos = useMemo(() => lista.data?.pages.flat() ?? [], [lista.data]);
  const avisosFiltrados = useMemo(() => filtrarAvisosPorBusca(avisos, busca), [avisos, busca]);
  // Com busca ativa, carrega as demais páginas para procurar em todos os avisos vigentes.
  useEffect(() => {
    if (!busca.trim() || !lista.hasNextPage || lista.isFetchingNextPage) return;
    void lista.fetchNextPage();
  }, [busca, lista.hasNextPage, lista.isFetchingNextPage, lista.fetchNextPage]);
  // Aviso aberto pelo sino/alerta pode não estar na página carregada.
  const extra = useQuery({
    queryKey: [...avisosKey, "um", abertoId],
    queryFn: async () => (await listarAvisos(false, 1, 0, false, abertoId))[0] ?? null,
    enabled: Boolean(abertoId) && !avisos.some((a) => a.id === abertoId),
  });
  const aberto: AvisoExibido | null = (abertoId && (avisos.find((a) => a.id === abertoId) ?? extra.data)) || null;
  const todos = useMutation({
    mutationFn: marcarTodosLidos,
    onSuccess: () => qc.invalidateQueries({ queryKey: avisosKey }),
    onError: (e: Error) => toast.error(e.message),
  });
  const buscando = Boolean(busca.trim());
  const vazio = avisos.length === 0;
  const semResultado = !vazio && avisosFiltrados.length === 0;
  const aindaBuscando = buscando && Boolean(lista.hasNextPage);

  return (
    <section className="mt-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant={filtro === "todos" ? "default" : "outline"} onClick={() => setFiltro("todos")}>Todos</Button>
          <Button size="sm" variant={filtro === "nao-lidos" ? "default" : "outline"} onClick={() => setFiltro("nao-lidos")}>
            Não lidos{naoLidos.data ? ` (${naoLidos.data})` : ""}
          </Button>
          <Button size="sm" variant={filtro === "obrigatorios" ? "default" : "outline"} onClick={() => setFiltro("obrigatorios")}>Leitura obrigatória</Button>
        </div>
        <Button size="sm" variant="ghost" disabled={!naoLidos.data || todos.isPending} onClick={() => todos.mutate()}><CheckCheck />Marcar todos como lidos</Button>
      </div>
      <div className="relative mb-4 w-full sm:max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input aria-label="Buscar avisos" placeholder="Buscar avisos" value={busca} onChange={(e) => setBusca(e.target.value)} className="pl-9" />
      </div>
      {lista.isError ? <p role="alert" className="py-6 text-destructive">{lista.error.message}</p> : lista.isLoading ? (
        <p className="py-10 text-center text-muted-foreground">Carregando avisos...</p>
      ) : vazio ? (
        <p className="rounded-lg border py-10 text-center text-muted-foreground">{filtro === "nao-lidos" ? "Você está em dia: nenhum aviso não lido." : filtro === "obrigatorios" ? "Nenhum aviso de leitura obrigatória." : "Nenhum aviso vigente no momento."}</p>
      ) : semResultado ? (
        <p className="rounded-lg border py-10 text-center text-muted-foreground">{aindaBuscando ? "Buscando em todos os avisos..." : `Nenhum aviso encontrado para “${busca.trim()}”.`}</p>
      ) : (
        <ul className="grid gap-2">
          {avisosFiltrados.map((a) => (
            <li key={a.id}>
              <Button type="button" variant="ghost" className={`aviso-item !h-auto w-full !flex-wrap !justify-start !whitespace-normal !text-left hover:!bg-muted hover:!text-foreground sm:!flex-nowrap ${a.lido ? "" : "is-unread"}`} onClick={() => void navigate({ search: { aviso: a.id } })}>
                <span className="aviso-dot" aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wide text-accent">{a.perfil_nome}</span>
                    {a.exige_confirmacao && (
                      <span className="aviso-tag-obrigatoria">
                        Leitura obrigatória{a.lido ? " · confirmada" : ""}
                      </span>
                    )}
                  </span>
                  <span className="mt-0.5 block truncate text-base text-foreground">{a.titulo}</span>
                </span>
                <span className="w-full text-xs text-muted-foreground sm:w-auto sm:shrink-0">{formatarDataBrasilia(a.publicar_em)}{a.editado_em ? " · editado" : ""}</span>
              </Button>
            </li>
          ))}
        </ul>
      )}
      {!buscando && lista.hasNextPage && (
        <div className="mt-4 text-center">
          <Button variant="outline" disabled={lista.isFetchingNextPage} onClick={() => void lista.fetchNextPage()}>{lista.isFetchingNextPage ? "Carregando..." : "Carregar mais"}</Button>
        </div>
      )}
      <AvisoLeitura aviso={aberto} onClose={() => void navigate({ search: {} })} />
    </section>
  );
}

const statusVariant: Record<StatusAviso, "default" | "secondary" | "outline"> = { Agendado: "secondary", Publicado: "default", Expirado: "outline", Arquivado: "outline" };

function Enviados({ onEdit }: { onEdit: (a: AvisoEnviado) => void }) {
  const qc = useQueryClient();
  const me = useCurrentUser();
  const [acompanhamento, setAcompanhamento] = useState<string | null>(null);
  const enviados = useQuery({ queryKey: [...avisosKey, "enviados"], queryFn: avisosEnviados });
  const [confirmar, setConfirmar] = useState<{ tipo: "arquivar" | "cancelar"; aviso: AvisoEnviado } | null>(null);
  const acao = useMutation({
    mutationFn: (c: NonNullable<typeof confirmar>) => (c.tipo === "arquivar" ? arquivarAviso(c.aviso.id) : cancelarAviso(c.aviso.id)),
    onSuccess: async (_d, c) => {
      toast.success(c.tipo === "arquivar" ? "Aviso arquivado." : "Agendamento cancelado.");
      await qc.invalidateQueries({ queryKey: avisosKey });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  if (enviados.isLoading) return <p className="py-10 text-center text-muted-foreground">Carregando...</p>;
  if (enviados.isError) return <p role="alert" className="text-destructive">{enviados.error.message}</p>;
  if (!enviados.data?.length) return <p className="mt-4 rounded-lg border py-10 text-center text-muted-foreground">Nenhum aviso enviado pelos seus perfis.</p>;
  return (
    <section className="mt-4 grid gap-2">
      {enviados.data.map((a) => {
        const st = statusAviso(a);
        return (
          <article key={a.id} className="flex flex-wrap items-center gap-4 rounded-lg border bg-card p-4">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={statusVariant[st]}>{st}</Badge>
                {a.exige_confirmacao && <Badge variant="outline">Leitura obrigatória</Badge>}
                <span className="text-xs font-bold uppercase text-accent">{a.perfil_nome}</span>
                {a.editado_em && <span className="text-xs text-muted-foreground">editado</span>}
              </div>
              <h3 className="mt-1 truncate font-bold">{a.titulo}</h3>
              <p className="text-xs text-muted-foreground">
                {st === "Agendado" ? "Publica em " : "Publicado em "}{formatarDataBrasilia(a.publicar_em)}
                {a.expira_em ? ` · expira em ${formatarDataBrasilia(a.expira_em)}` : ""} · por {a.autor_nome || "-"}
              </p>
            </div>
            {st !== "Agendado" && <p className="text-sm"><strong>{a.exige_confirmacao ? "Confirmado por" : "Lido por"} {a.lidos}</strong> de {a.ativos} ativos</p>}
            <div className="flex flex-wrap gap-1">
              {a.exige_confirmacao && me.data?.can("avisos.confirmacao") && <Button size="sm" variant="outline" onClick={() => setAcompanhamento(a.id)}><CheckCheck />Acompanhar leituras</Button>}
              {(st === "Agendado" || st === "Publicado") && <Button size="sm" variant="ghost" onClick={() => onEdit(a)}><Pencil />{st === "Agendado" ? "Editar" : "Corrigir"}</Button>}
              {st === "Agendado" && <Button size="sm" variant="ghost" onClick={() => setConfirmar({ tipo: "cancelar", aviso: a })}><Trash2 />Cancelar</Button>}
              {(st === "Publicado" || st === "Expirado") && <Button size="sm" variant="ghost" onClick={() => setConfirmar({ tipo: "arquivar", aviso: a })}><Archive />Arquivar</Button>}
            </div>
          </article>
        );
      })}
      <AvisoAcompanhamento id={acompanhamento} onClose={() => setAcompanhamento(null)} />
      <AlertDialog open={Boolean(confirmar)} onOpenChange={(o) => !o && setConfirmar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmar?.tipo === "arquivar" ? "Arquivar aviso?" : "Cancelar agendamento?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmar?.tipo === "arquivar" ? "O aviso sai da lista de todos os profissionais." : "O aviso agendado é excluído e não será publicado."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmar && acao.mutate(confirmar)}>{confirmar?.tipo === "arquivar" ? "Arquivar" : "Cancelar aviso"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
