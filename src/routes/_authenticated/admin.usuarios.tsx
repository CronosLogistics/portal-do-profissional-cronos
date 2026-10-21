import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, MailPlus, Pencil, Search, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";

import { AdminTabs } from "@/components/clube/AdminTabs";
import { Navbar } from "@/components/clube/Navbar";
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
import { inviteUser, listUsers, resendInvite, setUserActive, updateUser, type PortalUser } from "@/lib/users.functions";
import { USER_ROLES, normalizeUserInput, roleLabel, type UserRole } from "@/lib/users.rules";

export const Route = createFileRoute("/_authenticated/admin/usuarios")({
  head: () => ({
    meta: [
      { title: "Usuários | Portal do Profissional Cronos" },
      { name: "description", content: "Gestão de usuários e perfis de acesso do Portal do Profissional." },
      { property: "og:title", content: "Usuários | Portal do Profissional Cronos" },
      { property: "og:description", content: "Convide, edite e desative acessos ao portal." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: UsersPage,
});

type FormState = { id?: string; email: string; fullName: string; employeeId: string; role: UserRole };
const EMPTY: FormState = { email: "", fullName: "", employeeId: "", role: "funcionario" };

function UsersPage() {
  const me = useCurrentUser();
  const qc = useQueryClient();
  const fetchUsers = useServerFn(listUsers);
  const invite = useServerFn(inviteUser);
  const update = useServerFn(updateUser);
  const toggle = useServerFn(setUserActive);
  const resend = useServerFn(resendInvite);

  const users = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => fetchUsers(),
    enabled: me.data?.isAdmin === true,
  });

  const [query, setQuery] = useState("");
  const [form, setForm] = useState<FormState | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<PortalUser | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (users.data ?? []).filter(
      (u) => !q || u.fullName.toLowerCase().includes(q) || u.email.includes(q) || u.employeeId.toLowerCase().includes(q),
    );
  }, [users.data, query]);

  const save = useMutation({
    mutationFn: async (f: FormState) => {
      normalizeUserInput(f); // validação imediata na tela
      if (f.id) return update({ data: { ...f, id: f.id } });
      return invite({ data: { ...f, redirectTo: window.location.origin } });
    },
    onSuccess: (_r, f) => {
      toast.success(f.id ? "Usuário atualizado." : `Convite enviado para ${f.email.trim().toLowerCase()}.`);
      setForm(null);
      void qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e) => setFormError(e instanceof Error ? e.message : "Não foi possível salvar."),
  });

  const activate = useMutation({
    mutationFn: (u: PortalUser) => toggle({ data: { id: u.id, active: !u.isActive } }),
    onSuccess: (_r, u) => {
      toast.success(u.isActive ? "Acesso desativado." : "Acesso reativado.");
      setConfirm(null);
      void qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Não foi possível alterar o acesso."),
  });

  async function handleResend(u: PortalUser) {
    try {
      await resend({ data: { email: u.email, redirectTo: window.location.origin } });
      toast.success(`Link de acesso reenviado para ${u.email}.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível reenviar.");
    }
  }

  if (me.isPending) {
    return <div className="mx-auto max-w-6xl px-4 py-16"><Skeleton className="h-40 w-full" /></div>;
  }
  if (!me.data?.isAdmin) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <main className="mx-auto max-w-xl px-4 py-20 text-center">
          <h1 className="font-display text-2xl font-bold">Acesso restrito</h1>
          <p className="mt-2 text-muted-foreground">Apenas administradores podem gerenciar usuários.</p>
          <Button asChild className="mt-6"><Link to="/admin">Voltar</Link></Button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-10">
        <p className="text-xs uppercase tracking-widest text-primary">Área administrativa</p>
        <h1 className="mb-6 font-display text-2xl font-bold">Usuários e acessos</h1>
        <AdminTabs />

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nome, e-mail ou matrícula" className="pl-9" />
          </div>
          <Button onClick={() => { setForm(EMPTY); setFormError(null); }}>
            <UserPlus className="mr-1.5 h-4 w-4" /> Convidar usuário
          </Button>
        </div>

        <div className="glass-card mt-6 overflow-hidden rounded-2xl">
          {users.isPending ? (
            <div className="space-y-3 p-6">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : users.isError ? (
            <div className="p-10 text-center text-sm text-destructive">
              Não foi possível carregar os usuários.{" "}
              <button className="underline" onClick={() => users.refetch()}>Tentar novamente</button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-2 p-12 text-center text-muted-foreground">
              <Users className="h-8 w-8" />
              {query ? "Nenhum usuário encontrado para esta busca." : "Nenhum usuário cadastrado ainda."}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead className="hidden md:table-cell">Matrícula</TableHead>
                  <TableHead>Perfil</TableHead>
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
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={u.isActive}
                          disabled={u.id === me.data?.id}
                          onCheckedChange={() => setConfirm(u)}
                          aria-label={u.isActive ? "Desativar acesso" : "Reativar acesso"}
                        />
                        <span className="text-xs text-muted-foreground">
                          {!u.isActive ? "Inativo" : u.invitedPending ? "Convite pendente" : "Ativo"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {u.invitedPending && u.isActive ? (
                        <Button variant="ghost" size="sm" onClick={() => handleResend(u)} title="Reenviar link de acesso">
                          <MailPlus className="h-4 w-4" />
                        </Button>
                      ) : null}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setForm({ id: u.id, email: u.email, fullName: u.fullName, employeeId: u.employeeId, role: u.role });
                          setFormError(null);
                        }}
                        aria-label="Editar usuário"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </main>

      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{form?.id ? "Editar usuário" : "Convidar usuário"}</DialogTitle>
            <DialogDescription>
              {form?.id
                ? "Atualize os dados e o perfil de acesso."
                : "A pessoa receberá um e-mail com um link para criar a própria senha."}
            </DialogDescription>
          </DialogHeader>
          {form ? (
            <form
              id="user-form"
              className="space-y-4"
              noValidate
              onSubmit={(e) => { e.preventDefault(); setFormError(null); save.mutate(form); }}
            >
              <div className="space-y-2">
                <Label htmlFor="fn">Nome completo</Label>
                <Input id="fn" value={form.fullName} maxLength={120} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="em">E-mail</Label>
                <Input id="em" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mat">Matrícula do funcionário (opcional)</Label>
                <Input id="mat" value={form.employeeId} maxLength={40} onChange={(e) => setForm({ ...form, employeeId: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Perfil de acesso</Label>
                <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as UserRole })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {USER_ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {formError ? <p role="alert" className="text-sm text-destructive">{formError}</p> : null}
            </form>
          ) : null}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setForm(null)}>Cancelar</Button>
            <Button type="submit" form="user-form" disabled={save.isPending}>
              {save.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {form?.id ? "Salvar" : "Enviar convite"}
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
