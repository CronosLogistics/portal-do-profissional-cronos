import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, CheckCircle2, Loader2, Plus, RefreshCw, Search, Users, X } from "lucide-react";
import { toast } from "sonner";

import { AdminTabs } from "@/components/clube/AdminTabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { currentUserQueryKey, useCurrentUser } from "@/hooks/useAuth";
import { USERS_PAGE_SIZE, getSyncStatus, listUsers, syncNow, type PortalUser, type UserFilter } from "@/lib/users.functions";
import { adicionarMembro, listarPerfis, removerMembro } from "@/lib/perfis-client";

export const Route = createFileRoute("/_authenticated/admin/usuarios")({
  head: () => ({
    meta: [
      { title: "Usuários | Portal do Profissional Cronos" },
      { name: "description", content: "Gestão de usuários, perfis de acesso e sincronização com o Microsoft." },
      { property: "og:title", content: "Usuários | Portal do Profissional Cronos" },
      { property: "og:description", content: "Perfis de acesso, status e sincronização dos profissionais." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: UsersPage,
});

const fmt = (d: string | null) =>
  d ? new Date(d).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "—";

function UsersPage() {
  const me = useCurrentUser();
  const qc = useQueryClient();
  const fetchUsers = useServerFn(listUsers);
  const fetchStatus = useServerFn(getSyncStatus);
  const runSync = useServerFn(syncNow);
  const isAdmin = me.data?.can("admin.usuarios") === true;

  const [query, setQuery] = useState("");
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<UserFilter>("todos");
  const [pagina, setPagina] = useState(0);
  const [removing, setRemoving] = useState<{ user: PortalUser; perfil: PortalUser["perfis"][number] } | null>(null);

  useEffect(() => {
    const t = setTimeout(() => { setBusca(query.trim()); setPagina(0); }, 300);
    return () => clearTimeout(t);
  }, [query]);

  const users = useQuery({
    queryKey: ["admin-users", busca, filtro, pagina],
    queryFn: () => fetchUsers({ data: { busca, filtro, pagina } }),
    enabled: isAdmin,
    placeholderData: keepPreviousData,
  });
  const status = useQuery({ queryKey: ["sync-status"], queryFn: () => fetchStatus(), enabled: isAdmin });

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["admin-users"] });
    void qc.invalidateQueries({ queryKey: ["sync-status"] });
  };

  const sync = useMutation({
    mutationFn: () => runSync(),
    onSuccess: (r) => {
      if (r.emAndamento) toast.info(r.erro ?? "Sincronização em andamento.");
      else if (r.sucesso) toast.success(`${r.alterados} profissional(is) atualizado(s).`);
      else toast.error(r.erro ?? "A sincronização falhou.");
      refresh();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "A sincronização falhou."),
  });

  const perfis = useQuery({ queryKey: ["perfis"], queryFn: listarPerfis, enabled: isAdmin });
  const afterChange = () => {
    refresh();
    void qc.invalidateQueries({ queryKey: ["perfis"] });
    void qc.invalidateQueries({ queryKey: currentUserQueryKey });
  };
  const add = useMutation({
    mutationFn: (v: { perfilId: string; userId: string }) => adicionarMembro(v.perfilId, v.userId),
    onSuccess: () => { toast.success("Perfil adicionado."); afterChange(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Não foi possível adicionar."),
  });
  const remove = useMutation({
    mutationFn: (v: { perfilId: string; userId: string }) => removerMembro(v.perfilId, v.userId),
    onSuccess: () => { toast.success("Perfil removido."); setRemoving(null); afterChange(); },
    onError: (e) => { toast.error(e instanceof Error ? e.message : "Não foi possível remover."); setRemoving(null); },
  });

  if (me.isPending) return <Skeleton className="h-40 w-full" />;
  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-xl py-20 text-center">
        <h1 className="text-2xl font-bold">Acesso restrito</h1>
        <p className="mt-2 text-muted-foreground">Apenas administradores podem gerenciar usuários.</p>
        <Button asChild className="mt-6"><Link to="/">Voltar</Link></Button>
      </div>
    );
  }

  const list = users.data?.users ?? [];
  const total = users.data?.total ?? 0;
  const counts = users.data?.counts;
  const pages = Math.max(1, Math.ceil(total / USERS_PAGE_SIZE));
  const s = status.data;
  const syncing = sync.isPending || s?.emExecucao === true;

  return (
    <div>
      <p className="text-xs uppercase tracking-widest text-primary">Área administrativa</p>
      <h1 className="mb-6 text-2xl font-bold">Usuários e acessos</h1>
      <AdminTabs />

      <div className="mt-6 grid gap-4 md:grid-cols-4">
        <Stat label="Profissionais" value={counts?.total ?? 0} />
        <Stat label="Ativos" value={counts?.ativos ?? 0} />
        <Stat label="Inativos" value={counts?.inativos ?? 0} />
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground">Última sincronização</p>
          <div className="mt-1 flex items-center gap-1.5 text-sm font-medium">
            {s?.sucesso === false ? <AlertTriangle className="h-4 w-4 text-destructive" /> :
              s?.sucesso ? <CheckCircle2 className="h-4 w-4 text-primary" /> : null}
            {s?.executadoEm ? fmt(s.executadoEm) : "Ainda não executada"}
          </div>
          {s?.executadoEm ? (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {s.origem === "manual" ? `Manual${s.disparadoPor ? ` · ${s.disparadoPor}` : ""}` : "Automática"} · {s.alterados} alterado(s)
            </p>
          ) : null}
          <Button variant="outline" size="sm" className="mt-2" disabled={syncing} onClick={() => sync.mutate()}>
            {syncing ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="mr-1.5 h-3.5 w-3.5" />}
            Sincronizar com o Microsoft 365
          </Button>
        </div>
      </div>
      {s?.sucesso === false && s.erro ? (
        <p role="alert" className="mt-3 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          Última sincronização falhou: {s.erro}
        </p>
      ) : null}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nome ou e-mail" className="pl-9" />
        </div>
        <Select value={filtro} onValueChange={(v) => { setFiltro(v as UserFilter); setPagina(0); }}>
          <SelectTrigger className="w-44" aria-label="Filtrar profissionais"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="ativos">Ativos</SelectItem>
            <SelectItem value="inativos">Inativos</SelectItem>
            <SelectItem value="com-perfil">Com perfil</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="mt-4 overflow-hidden rounded-lg border bg-card">
        {users.isPending ? (
          <div className="space-y-3 p-6">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : users.isError ? (
          <div className="p-10 text-center text-sm text-destructive">
            Não foi possível carregar os usuários.{" "}
            <button className="underline" onClick={() => users.refetch()}>Tentar novamente</button>
          </div>
        ) : list.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-12 text-center text-muted-foreground">
            <Users className="h-8 w-8" /> Nenhum profissional encontrado.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead className="hidden md:table-cell">E-mail</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Perfis</TableHead>
                <TableHead className="hidden lg:table-cell">Último acesso</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.fullName || "—"}</TableCell>
                  <TableCell className="hidden text-sm md:table-cell">{u.email}</TableCell>
                  <TableCell>
                    <Badge variant={u.isActive ? "secondary" : "outline"}>{u.isActive ? "Ativo" : "Inativo"}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-1">
                      {u.perfis.map((p) => (
                        <Badge key={p.id} variant={p.sistema ? "default" : "secondary"} className="gap-1 pr-1">
                          {p.nome}
                          <button
                            type="button"
                            aria-label={`Remover perfil ${p.nome}`}
                            className="rounded-sm opacity-70 hover:opacity-100"
                            onClick={() => p.sistema ? setRemoving({ user: u, perfil: p }) : remove.mutate({ perfilId: p.id, userId: u.id })}
                          ><X className="h-3 w-3" /></button>
                        </Badge>
                      ))}
                      {u.isActive ? (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" size="icon" className="h-6 w-6" aria-label="Adicionar perfil"><Plus className="h-3 w-3" /></Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-56 p-1">
                            {(perfis.data ?? []).filter((p) => p.ativo && !u.perfis.some((x) => x.id === p.id)).map((p) => (
                              <button key={p.id} type="button" className="block w-full rounded px-2 py-1.5 text-left text-sm hover:bg-muted"
                                onClick={() => add.mutate({ perfilId: p.id, userId: u.id })}>{p.nome}</button>
                            ))}
                            {(perfis.data ?? []).filter((p) => p.ativo && !u.perfis.some((x) => x.id === p.id)).length === 0 &&
                              <p className="px-2 py-1.5 text-xs text-muted-foreground">Nenhum perfil disponível.</p>}
                          </PopoverContent>
                        </Popover>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="hidden text-sm lg:table-cell">{fmt(u.lastSignInAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
        <p>Nome, e-mail e status vêm do Microsoft e são atualizados diariamente ou pelo botão de sincronização.</p>
        {total > 0 ? (
          <div className="flex items-center gap-2">
            <span>Página {pagina + 1} de {pages} · {total} profissional(is)</span>
            <Button variant="outline" size="sm" disabled={pagina === 0} onClick={() => setPagina((p) => p - 1)}>Anterior</Button>
            <Button variant="outline" size="sm" disabled={pagina + 1 >= pages} onClick={() => setPagina((p) => p + 1)}>Próxima</Button>
          </div>
        ) : null}
      </div>

      <AlertDialog open={!!removing} onOpenChange={(o) => !o && setRemoving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover do perfil Administrador?</AlertDialogTitle>
            <AlertDialogDescription>
              {removing?.user.fullName || removing?.user.email} perderá todos os acessos de administração.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => removing && remove.mutate({ perfilId: removing.perfil.id, userId: removing.user.id })}>Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold text-secondary-foreground">{value}</p>
    </div>
  );
}
