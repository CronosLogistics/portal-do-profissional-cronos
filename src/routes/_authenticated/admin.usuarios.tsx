import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, CheckCircle2, Loader2, Pencil, RefreshCw, Search, Users } from "lucide-react";
import { toast } from "sonner";

import { AdminTabs } from "@/components/clube/AdminTabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCurrentUser } from "@/hooks/useAuth";
import { getSyncStatus, listUsers, setUserActive, syncNow, updateUser, type PortalUser } from "@/lib/users.functions";
import { USER_ROLES, roleLabel, type UserRole } from "@/lib/users.rules";

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
  const update = useServerFn(updateUser);
  const toggle = useServerFn(setUserActive);
  const isAdmin = me.data?.isAdmin === true;

  const users = useQuery({ queryKey: ["admin-users"], queryFn: () => fetchUsers(), enabled: isAdmin });
  const status = useQuery({ queryKey: ["sync-status"], queryFn: () => fetchStatus(), enabled: isAdmin });

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [roleFilter, setRoleFilter] = useState("todos");
  const [editing, setEditing] = useState<{ user: PortalUser; role: UserRole } | null>(null);
  const [confirm, setConfirm] = useState<PortalUser | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (users.data ?? []).filter((u) => {
      if (q && !(u.fullName.toLowerCase().includes(q) || u.email.includes(q) || u.employeeId.toLowerCase().includes(q))) return false;
      if (statusFilter === "ativos" && !u.isActive) return false;
      if (statusFilter === "inativos" && u.isActive) return false;
      if (statusFilter === "sem-acesso" && u.lastSignInAt) return false;
      if (roleFilter !== "todos" && u.role !== roleFilter) return false;
      return true;
    });
  }, [users.data, query, statusFilter, roleFilter]);

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["admin-users"] });
    void qc.invalidateQueries({ queryKey: ["sync-status"] });
  };

  const sync = useMutation({
    mutationFn: () => runSync(),
    onSuccess: (r) => {
      if (r.sucesso) toast.success(`Sincronização concluída: ${r.alterados} cadastro(s) atualizado(s).`);
      else toast.error(r.erro ?? "A sincronização falhou.");
      refresh();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "A sincronização falhou."),
  });

  const saveRole = useMutation({
    mutationFn: (e: { user: PortalUser; role: UserRole }) =>
      update({ data: { id: e.user.id, email: e.user.email, fullName: e.user.fullName, employeeId: e.user.employeeId, role: e.role } }),
    onSuccess: () => { toast.success("Perfil atualizado."); setEditing(null); refresh(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Não foi possível salvar."),
  });

  const activate = useMutation({
    mutationFn: (u: PortalUser) => toggle({ data: { id: u.id, active: !u.isActive } }),
    onSuccess: (_r, u) => { toast.success(u.isActive ? "Acesso desativado." : "Acesso reativado."); setConfirm(null); refresh(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Não foi possível alterar o acesso."),
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

  const all = users.data ?? [];
  const s = status.data;

  return (
    <div>
      <p className="text-xs uppercase tracking-widest text-primary">Área administrativa</p>
      <h1 className="mb-6 text-2xl font-bold">Usuários e acessos</h1>
      <AdminTabs />

      <div className="mt-6 grid gap-4 md:grid-cols-4">
        <Stat label="Profissionais" value={all.length} />
        <Stat label="Ativos" value={all.filter((u) => u.isActive).length} />
        <Stat label="Inativos" value={all.filter((u) => !u.isActive).length} />
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground">Sincronização com o Microsoft</p>
          <div className="mt-1 flex items-center gap-1.5 text-sm font-medium">
            {s?.sucesso === false ? <AlertTriangle className="h-4 w-4 text-destructive" /> :
              s?.sucesso ? <CheckCircle2 className="h-4 w-4 text-primary" /> : null}
            {s?.executadoEm ? fmt(s.executadoEm) : "Ainda não executada"}
          </div>
          <Button variant="outline" size="sm" className="mt-2" disabled={sync.isPending} onClick={() => sync.mutate()}>
            {sync.isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="mr-1.5 h-3.5 w-3.5" />}
            Sincronizar agora
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
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nome, e-mail ou matrícula" className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44" aria-label="Filtrar por status"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            <SelectItem value="ativos">Ativos</SelectItem>
            <SelectItem value="inativos">Inativos</SelectItem>
            <SelectItem value="sem-acesso">Nunca acessaram</SelectItem>
          </SelectContent>
        </Select>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-56" aria-label="Filtrar por perfil"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os perfis</SelectItem>
            {USER_ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
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
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-12 text-center text-muted-foreground">
            <Users className="h-8 w-8" /> Nenhum profissional encontrado.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead className="hidden md:table-cell">Matrícula</TableHead>
                <TableHead>Perfil</TableHead>
                <TableHead className="hidden lg:table-cell">Último acesso</TableHead>
                <TableHead className="hidden lg:table-cell">Sincronizado</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <p className="font-medium">{u.fullName || "—"}</p>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{u.employeeId || "—"}</TableCell>
                  <TableCell><Badge variant={u.role === "admin" ? "default" : "secondary"}>{roleLabel(u.role)}</Badge></TableCell>
                  <TableCell className="hidden text-sm lg:table-cell">{fmt(u.lastSignInAt)}</TableCell>
                  <TableCell className="hidden text-sm lg:table-cell">{fmt(u.syncedAt)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={u.isActive}
                        disabled={u.id === me.data?.id}
                        onCheckedChange={() => setConfirm(u)}
                        aria-label={u.isActive ? "Desativar acesso" : "Reativar acesso"}
                      />
                      <span className="text-xs text-muted-foreground">{u.isActive ? "Ativo" : "Inativo"}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => setEditing({ user: u, role: u.role })} aria-label="Alterar perfil">
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Os profissionais entram com a conta Microsoft da Cronos. Nome, e-mail, matrícula e status são atualizados diariamente a partir do Microsoft.
      </p>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar perfil de acesso</DialogTitle>
            <DialogDescription>{editing?.user.fullName} · {editing?.user.email}</DialogDescription>
          </DialogHeader>
          {editing ? (
            <div className="space-y-2">
              <Label>Perfil de acesso</Label>
              <Select value={editing.role} onValueChange={(v) => setEditing({ ...editing, role: v as UserRole })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {USER_ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button disabled={saveRole.isPending} onClick={() => editing && saveRole.mutate(editing)}>
              {saveRole.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirm?.isActive ? "Desativar acesso?" : "Reativar acesso?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.isActive
                ? `${confirm?.fullName || confirm?.email} não conseguirá mais entrar no portal.`
                : `${confirm?.fullName || confirm?.email} voltará a acessar o portal.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirm && activate.mutate(confirm)}>
              {confirm?.isActive ? "Desativar" : "Reativar"}
            </AlertDialogAction>
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
