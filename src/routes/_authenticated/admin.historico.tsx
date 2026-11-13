import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { History } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { AdminTabs } from "@/components/clube/AdminTabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { TableHeadOrdenavel } from "@/components/ui/cabecalho-ordenavel";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCurrentUser } from "@/hooks/useAuth";
import { useOrdenacaoTabela } from "@/hooks/useOrdenacaoTabela";

export const Route = createFileRoute("/_authenticated/admin/historico")({
  head: () => ({
    meta: [
      { title: "Histórico | Portal do Profissional Cronos" },
      { name: "description", content: "Registro de quem alterou perfis, permissões, conteúdos, avisos e formulários." },
      { property: "og:title", content: "Histórico | Portal do Profissional Cronos" },
      { property: "og:description", content: "Log de auditoria das alterações do portal." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: HistoricoPage,
});

const MODULOS = ["Perfis", "Permissões", "Benefícios", "Parceiros", "Recompensas", "Avisos", "Formulários", "Textos do portal"];
const POR_PAGINA = 50;
const TODOS = "__todos";

type Log = {
  id: string; criado_em: string; autor_nome: string; acao: string; alvo: string;
  operacao: string; modulo: string; antes: Record<string, unknown> | null; depois: Record<string, unknown> | null; total: number;
};

const fmt = (d: string) => new Date(d).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
const valor = (v: unknown) => (v === null || v === undefined || v === "" ? "—" : typeof v === "object" ? JSON.stringify(v) : String(v));

function HistoricoPage() {
  const me = useCurrentUser();
  const isAdmin = me.data?.isAdmin === true;
  const [autor, setAutor] = useState(TODOS);
  const [modulo, setModulo] = useState(TODOS);
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");
  const [pagina, setPagina] = useState(0);
  const [aberto, setAberto] = useState<Log | null>(null);

  const autores = useQuery({
    queryKey: ["auditoria-autores"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("autores_auditoria");
      if (error) throw error;
      return data ?? [];
    },
  });

  const logs = useQuery({
    queryKey: ["auditoria", autor, modulo, de, ate, pagina],
    enabled: isAdmin,
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("listar_auditoria", {
        _autor: autor === TODOS ? null : autor,
        _modulo: modulo === TODOS ? null : modulo,
        _de: de || null,
        _ate: ate || null,
        _limite: POR_PAGINA,
        _deslocamento: pagina * POR_PAGINA,
      } as never);
      if (error) throw error;
      return (data ?? []) as unknown as Log[];
    },
  });

  const linhasBase = logs.data ?? [];
  const { itens: linhas, ordenacao, alternar } = useOrdenacaoTabela(linhasBase, {
    data: (l) => l.criado_em,
    quem: (l) => l.autor_nome,
    acao: (l) => l.acao,
    onde: (l) => l.alvo,
  });

  if (me.data && !isAdmin) {
    return <p className="text-muted-foreground">Apenas administradores podem ver o histórico.</p>;
  }

  const total = Number(linhasBase[0]?.total ?? 0);
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));

  return (
    <div className="space-y-6">
      <AdminTabs />
      <div className="flex items-center gap-2">
        <History className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold text-secondary">Histórico</h1>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Select value={autor} onValueChange={(v) => { setAutor(v); setPagina(0); }}>
          <SelectTrigger aria-label="Pessoa"><SelectValue placeholder="Pessoa" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={TODOS}>Todas as pessoas</SelectItem>
            {(autores.data ?? []).map((a) => <SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={modulo} onValueChange={(v) => { setModulo(v); setPagina(0); }}>
          <SelectTrigger aria-label="Tipo"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={TODOS}>Todos os tipos</SelectItem>
            {MODULOS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input type="date" aria-label="De" value={de} onChange={(e) => { setDe(e.target.value); setPagina(0); }} />
        <Input type="date" aria-label="Até" value={ate} onChange={(e) => { setAte(e.target.value); setPagina(0); }} />
      </div>

      <div className="rounded-md border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHeadOrdenavel coluna="data" ordenacao={ordenacao} onOrdenar={alternar}>Data e hora</TableHeadOrdenavel>
              <TableHeadOrdenavel coluna="quem" ordenacao={ordenacao} onOrdenar={alternar}>Quem</TableHeadOrdenavel>
              <TableHeadOrdenavel coluna="acao" ordenacao={ordenacao} onOrdenar={alternar}>O que fez</TableHeadOrdenavel>
              <TableHeadOrdenavel coluna="onde" ordenacao={ordenacao} onOrdenar={alternar}>Onde</TableHeadOrdenavel>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.isLoading && <TableRow><TableCell colSpan={4} className="text-muted-foreground">Carregando…</TableCell></TableRow>}
            {logs.error && <TableRow><TableCell colSpan={4} className="text-destructive">Não foi possível carregar o histórico.</TableCell></TableRow>}
            {!logs.isLoading && !logs.error && linhas.length === 0 && (
              <TableRow><TableCell colSpan={4} className="text-muted-foreground">Nenhum registro encontrado.</TableCell></TableRow>
            )}
            {linhas.map((l) => (
              <TableRow key={l.id} className="cursor-pointer" onClick={() => setAberto(l)}>
                <TableCell className="whitespace-nowrap">{fmt(l.criado_em)}</TableCell>
                <TableCell>{l.autor_nome}</TableCell>
                <TableCell>{l.acao}</TableCell>
                <TableCell>{l.alvo || "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{total} registro(s)</span>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={pagina === 0} onClick={() => setPagina((p) => p - 1)}>Anterior</Button>
          <span>{pagina + 1} / {paginas}</span>
          <Button variant="outline" size="sm" disabled={pagina + 1 >= paginas} onClick={() => setPagina((p) => p + 1)}>Próxima</Button>
        </div>
      </div>

      <Dialog open={!!aberto} onOpenChange={(o) => !o && setAberto(null)}>
        <DialogContent className="max-w-3xl">
          {aberto && (
            <>
              <DialogHeader>
                <DialogTitle className="text-secondary">{aberto.acao}</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">
                {fmt(aberto.criado_em)} · {aberto.autor_nome} · {aberto.alvo || aberto.modulo}
              </p>
              <Detalhes log={aberto} />
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Detalhes({ log }: { log: Log }) {
  const chaves = Array.from(new Set([...Object.keys(log.antes ?? {}), ...Object.keys(log.depois ?? {})])).map((campo) => ({
    campo,
    antes: valor(log.antes?.[campo]),
    depois: valor(log.depois?.[campo]),
  }));
  const { itens, ordenacao, alternar } = useOrdenacaoTabela(chaves, {
    campo: (r) => r.campo,
    antes: (r) => r.antes,
    depois: (r) => r.depois,
  });
  if (chaves.length === 0) return <p className="text-sm text-muted-foreground">Sem detalhes.</p>;
  return (
    <div className="max-h-[60vh] overflow-auto rounded-md border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHeadOrdenavel coluna="campo" ordenacao={ordenacao} onOrdenar={alternar}>Campo</TableHeadOrdenavel>
            {log.operacao !== "INSERT" && <TableHeadOrdenavel coluna="antes" ordenacao={ordenacao} onOrdenar={alternar}>Antes</TableHeadOrdenavel>}
            {log.operacao !== "DELETE" && <TableHeadOrdenavel coluna="depois" ordenacao={ordenacao} onOrdenar={alternar}>Depois</TableHeadOrdenavel>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {itens.map((r) => (
            <TableRow key={r.campo}>
              <TableCell className="font-medium">{r.campo}</TableCell>
              {log.operacao !== "INSERT" && <TableCell className="max-w-xs break-words text-xs">{r.antes}</TableCell>}
              {log.operacao !== "DELETE" && <TableCell className="max-w-xs break-words text-xs">{r.depois}</TableCell>}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
