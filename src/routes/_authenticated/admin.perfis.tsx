import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Lock, Plus, Search, ShieldCheck, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { AdminTabs } from "@/components/clube/AdminTabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { currentUserQueryKey, useCurrentUser } from "@/hooks/useAuth";
import { PERMISSOES, podeExcluirPerfil } from "@/lib/permissions";
import {
  adicionarMembro, atualizarPerfil, buscarAtivos, criarPerfil, excluirPerfil, listarMembros, listarPerfis,
  marcarPermissao, removerMembro, type PerfilResumo,
} from "@/lib/perfis-client";

export const Route = createFileRoute("/_authenticated/admin/perfis")({
  head: () => ({
    meta: [
      { title: "Perfis de acesso | Portal do Profissional Cronos" },
      { name: "description", content: "Crie perfis, marque permissões e defina quem faz parte de cada um." },
      { property: "og:title", content: "Perfis de acesso | Portal do Profissional Cronos" },
      { property: "og:description", content: "Perfis, permissões e pessoas do Portal do Profissional." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PerfisPage,
});

const msg = (e: unknown) => (e instanceof Error ? e.message : "Não foi possível concluir a operação.");

function PerfisPage() {
  const me = useCurrentUser();
  const qc = useQueryClient();
  const allowed = me.data?.can("admin.perfis") === true;
  const perfis = useQuery({ queryKey: ["perfis"], queryFn: listarPerfis, enabled: allowed });
  const [selId, setSelId] = useState<string | null>(null);
  const [novo, setNovo] = useState(false);

  const list = perfis.data ?? [];
  const sel = list.find((p) => p.id === selId) ?? list[0];

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["perfis"] });
    void qc.invalidateQueries({ queryKey: ["admin-users"] });
    void qc.invalidateQueries({ queryKey: currentUserQueryKey });
  };

  if (me.isPending) return <Skeleton className="h-40 w-full" />;
  if (!allowed) {
    return (
      <div className="mx-auto max-w-xl py-20 text-center">
        <h1 className="text-2xl font-bold">Acesso restrito</h1>
        <p className="mt-2 text-muted-foreground">Você não tem permissão para gerenciar perfis.</p>
        <Button asChild className="mt-6"><Link to="/">Voltar</Link></Button>
      </div>
    );
  }

  return (
    <div>
      <p className="text-xs uppercase tracking-widest text-primary">Área administrativa</p>
      <h1 className="mb-6 text-2xl font-bold">Perfis de acesso</h1>
      <AdminTabs />
      <p className="mt-4 max-w-3xl text-sm text-muted-foreground">
        Todo profissional ativo já tem o acesso básico ao portal. Os perfis liberam o que vai além disso; quem tem mais de um perfil soma as permissões.
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="rounded-lg border bg-card">
          <div className="flex items-center justify-between border-b p-3">
            <span className="text-sm font-semibold">Perfis</span>
            <Button size="sm" onClick={() => setNovo(true)}><Plus className="mr-1 h-4 w-4" /> Novo perfil</Button>
          </div>
          {perfis.isPending ? (
            <div className="space-y-2 p-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-10" />)}</div>
          ) : (
            <ul className="p-1">
              {list.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => setSelId(p.id)}
                    className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm hover:bg-muted ${sel?.id === p.id ? "bg-primary/10 font-semibold text-secondary" : ""}`}
                  >
                    <span className="flex items-center gap-1.5">
                      {p.sistema ? <Lock className="h-3.5 w-3.5" /> : null}
                      <span className={p.ativo ? "" : "text-muted-foreground line-through"}>{p.nome}</span>
                    </span>
                    <Badge variant="outline">{p.membros}</Badge>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        {sel ? <PerfilDetalhe key={sel.id} perfil={sel} onChange={refresh} onDeleted={() => { setSelId(null); refresh(); }} /> : null}
      </div>

      <NovoPerfil open={novo} onClose={() => setNovo(false)} onCreated={refresh} />
    </div>
  );
}

function PerfilDetalhe({ perfil, onChange, onDeleted }: { perfil: PerfilResumo; onChange: () => void; onDeleted: () => void }) {
  const qc = useQueryClient();
  const [nome, setNome] = useState(perfil.nome);
  const [descricao, setDescricao] = useState(perfil.descricao);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const membros = useQuery({ queryKey: ["perfil-membros", perfil.id], queryFn: () => listarMembros(perfil.id) });
  const [removing, setRemoving] = useState<{ id: string; nome: string } | null>(null);

  const done = () => { onChange(); void qc.invalidateQueries({ queryKey: ["perfil-membros", perfil.id] }); };

  const salvar = useMutation({
    mutationFn: () => atualizarPerfil(perfil.id, { nome, descricao }),
    onSuccess: () => { toast.success("Perfil salvo."); onChange(); },
    onError: (e) => toast.error(msg(e)),
  });
  const ativo = useMutation({
    mutationFn: (v: boolean) => atualizarPerfil(perfil.id, { ativo: v }),
    onSuccess: (_d, v) => { toast.success(v ? "Perfil ativado." : "Perfil desativado."); onChange(); },
    onError: (e) => toast.error(msg(e)),
  });
  const perm = useMutation({
    mutationFn: (v: { codigo: string; marcado: boolean }) => marcarPermissao(perfil.id, v.codigo, v.marcado),
    onSuccess: onChange,
    onError: (e) => toast.error(msg(e)),
  });
  const add = useMutation({
    mutationFn: (userId: string) => adicionarMembro(perfil.id, userId),
    onSuccess: () => { toast.success("Pessoa adicionada."); done(); },
    onError: (e) => toast.error(msg(e)),
  });
  const remove = useMutation({
    mutationFn: (userId: string) => removerMembro(perfil.id, userId),
    onSuccess: () => { toast.success("Pessoa removida."); setRemoving(null); done(); },
    onError: (e) => { toast.error(msg(e)); setRemoving(null); },
  });
  const excluir = useMutation({
    mutationFn: () => excluirPerfil(perfil.id),
    onSuccess: () => { toast.success("Perfil excluído."); onDeleted(); },
    onError: (e) => toast.error(msg(e)),
  });

  const deletable = podeExcluirPerfil({ sistema: perfil.sistema, membros: perfil.membros });
  const dirty = nome.trim() !== perfil.nome || descricao.trim() !== perfil.descricao;

  return (
    <section className="space-y-6">
      <div className="rounded-lg border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">{perfil.nome}</h2>
            {perfil.sistema ? <Badge><ShieldCheck className="mr-1 h-3 w-3" /> Perfil de sistema</Badge> : null}
          </div>
          {!perfil.sistema ? (
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={perfil.ativo} disabled={ativo.isPending} onCheckedChange={(v) => ativo.mutate(v)} aria-label="Perfil ativo" />
                {perfil.ativo ? "Ativo" : "Desativado"}
              </label>
              {deletable ? (
                <Button variant="outline" size="sm" onClick={() => setConfirmDelete(true)}><Trash2 className="mr-1 h-4 w-4" /> Excluir</Button>
              ) : null}
            </div>
          ) : null}
        </div>
        {perfil.sistema ? (
          <p className="mt-2 text-sm text-muted-foreground">Tem todas as permissões, não pode ser excluído e precisa de pelo menos um membro ativo.</p>
        ) : (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="perfil-nome">Nome</Label>
              <Input id="perfil-nome" value={nome} maxLength={60} onChange={(e) => setNome(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="perfil-desc">Descrição</Label>
              <Input id="perfil-desc" value={descricao} maxLength={300} onChange={(e) => setDescricao(e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <Button size="sm" disabled={!dirty || salvar.isPending} onClick={() => salvar.mutate()}>
                {salvar.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null} Salvar
              </Button>
              {!deletable ? <span className="ml-3 text-xs text-muted-foreground">Perfil com membros não pode ser excluído, só desativado.</span> : null}
            </div>
          </div>
        )}
      </div>

      <div className="rounded-lg border bg-card p-5">
        <h3 className="mb-3 text-sm font-semibold">Permissões</h3>
        <ul className="space-y-3">
          {PERMISSOES.map((p) => {
            const checked = perfil.sistema || perfil.permissoes.includes(p.codigo);
            return (
              <li key={p.codigo} className="flex items-start gap-3">
                <Checkbox
                  id={`perm-${p.codigo}`}
                  checked={checked}
                  disabled={perfil.sistema || perm.isPending}
                  onCheckedChange={(v) => perm.mutate({ codigo: p.codigo, marcado: v === true })}
                  className="mt-0.5"
                />
                <label htmlFor={`perm-${p.codigo}`} className="text-sm">
                  <span className="font-medium">{p.nome}</span>{" "}
                  <code className="rounded bg-muted px-1 text-xs text-muted-foreground">{p.codigo}</code>
                  <span className="block text-xs text-muted-foreground">{p.descricao}</span>
                </label>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="rounded-lg border bg-card p-5">
        <h3 className="mb-3 text-sm font-semibold">Pessoas no perfil</h3>
        <BuscaAtivos excluir={(membros.data ?? []).map((m) => m.id)} onPick={(id) => add.mutate(id)} />
        {membros.isPending ? <Skeleton className="mt-3 h-10" /> : (membros.data ?? []).length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">Nenhuma pessoa neste perfil.</p>
        ) : (
          <div className="mt-3 flex flex-wrap gap-2">
            {(membros.data ?? []).map((m) => (
              <Badge key={m.id} variant="secondary" className="gap-1 py-1 pr-1">
                {m.full_name || m.email}{!m.is_active ? " (inativo)" : ""}
                <button type="button" aria-label={`Remover ${m.full_name || m.email}`} className="rounded-sm opacity-70 hover:opacity-100"
                  onClick={() => perfil.sistema ? setRemoving({ id: m.id, nome: m.full_name || m.email }) : remove.mutate(m.id)}>
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      <AlertDialog open={!!removing} onOpenChange={(o) => !o && setRemoving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover do perfil Administrador?</AlertDialogTitle>
            <AlertDialogDescription>{removing?.nome} perderá todos os acessos de administração.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => removing && remove.mutate(removing.id)}>Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir o perfil {perfil.nome}?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => excluir.mutate()}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

function BuscaAtivos({ excluir, onPick }: { excluir: string[]; onPick: (id: string) => void }) {
  const [q, setQ] = useState("");
  const [busca, setBusca] = useState("");
  useEffect(() => { const t = setTimeout(() => setBusca(q.trim()), 300); return () => clearTimeout(t); }, [q]);
  const res = useQuery({ queryKey: ["buscar-ativos", busca], queryFn: () => buscarAtivos(busca), enabled: busca.length >= 2 });
  const options = (res.data ?? []).filter((p) => !excluir.includes(p.id));
  return (
    <div className="relative max-w-md">
      <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Adicionar pessoa (busque por nome ou e-mail)" className="pl-9" />
      {busca.length >= 2 ? (
        <div className="absolute z-10 mt-1 w-full rounded-md border bg-popover p-1 shadow-md">
          {res.isPending ? <p className="px-2 py-1.5 text-xs text-muted-foreground">Buscando…</p> :
            options.length === 0 ? <p className="px-2 py-1.5 text-xs text-muted-foreground">Nenhum profissional ativo encontrado.</p> :
              options.map((p) => (
                <button key={p.id} type="button" className="block w-full rounded px-2 py-1.5 text-left text-sm hover:bg-muted"
                  onClick={() => { onPick(p.id); setQ(""); setBusca(""); }}>
                  {p.full_name || p.email} <span className="text-xs text-muted-foreground">{p.email}</span>
                </button>
              ))}
        </div>
      ) : null}
    </div>
  );
}

function NovoPerfil({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const criar = useMutation({
    mutationFn: () => criarPerfil(nome, descricao),
    onSuccess: () => { toast.success("Perfil criado."); setNome(""); setDescricao(""); onClose(); onCreated(); },
    onError: (e) => toast.error(msg(e)),
  });
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Novo perfil</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="novo-nome">Nome</Label>
            <Input id="novo-nome" value={nome} maxLength={60} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Comercial" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="novo-desc">Descrição</Label>
            <Textarea id="novo-desc" value={descricao} maxLength={300} onChange={(e) => setDescricao(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button disabled={!nome.trim() || criar.isPending} onClick={() => criar.mutate()}>
            {criar.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Criar perfil
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
