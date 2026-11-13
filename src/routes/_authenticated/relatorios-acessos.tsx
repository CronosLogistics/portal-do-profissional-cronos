import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, Search } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { TableHeadOrdenavel } from "@/components/ui/cabecalho-ordenavel";
import { useOrdenacaoTabela } from "@/hooks/useOrdenacaoTabela";
import { diasSemAcessar, indicadores, situacao, type EventoAcesso, type UsuarioAcesso } from "@/lib/relatorios-acessos.rules";

export const Route = createFileRoute("/_authenticated/relatorios-acessos")({
  beforeLoad: async () => {
    const { data } = await supabase.rpc("minhas_permissoes");
    if (!((data as string[] | null) ?? []).includes("acessos.relatorios")) throw redirect({ to: "/" });
  },
  head: () => ({
    meta: [
      { title: "Relatórios de acesso | Portal do Profissional Cronos" },
      { name: "description", content: "Indicadores de quem acessa o portal e com qual frequência." },
      { property: "og:title", content: "Relatórios de acesso | Portal do Profissional Cronos" },
      { property: "og:description", content: "Painel e lista de acessos dos profissionais ao portal." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: RelatoriosAcessosPage,
});

const TODOS = "__todos";
const fmt = (d: string | null) => (d ? new Date(d).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }) : "—");
const pct = (n: number) => `${(n * 100).toFixed(1).replace(".", ",")}%`;
const COR = "var(--primary)";

function RelatoriosAcessosPage() {
  const [periodo, setPeriodo] = useState("30");
  const [busca, setBusca] = useState("");
  const [setor, setSetor] = useState(TODOS);
  const [sit, setSit] = useState(TODOS);
  const dias = Number(periodo);

  const usuariosQ = useQuery({
    queryKey: ["relatorio-acessos-usuarios"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("relatorio_acessos_usuarios");
      if (error) throw error;
      return (data ?? []).map((r) => ({ ...r, total_acessos: Number(r.total_acessos), acessos_30d: Number(r.acessos_30d) })) as UsuarioAcesso[];
    },
  });
  const eventosQ = useQuery({
    queryKey: ["relatorio-acessos-eventos", dias],
    queryFn: async () => {
      const de = new Date(Date.now() - dias * 86_400_000).toISOString();
      const { data, error } = await supabase.rpc("relatorio_acessos_eventos", { _de: de });
      if (error) throw error;
      return (data ?? []) as EventoAcesso[];
    },
  });

  const usuarios = usuariosQ.data ?? [];
  const ind = useMemo(() => indicadores(usuarios, eventosQ.data ?? [], dias), [usuarios, eventosQ.data, dias]);
  const setores = useMemo(() => [...new Set(usuarios.map((u) => u.departamento ?? "Sem setor"))].sort(), [usuarios]);
  const filtrados = usuarios.filter((u) => {
    const t = busca.trim().toLocaleLowerCase("pt-BR");
    return (!t || u.nome.toLocaleLowerCase("pt-BR").includes(t) || u.email.toLowerCase().includes(t))
      && (setor === TODOS || (u.departamento ?? "Sem setor") === setor)
      && (sit === TODOS || situacao(u) === sit);
  });
  const setoresTabela = useOrdenacaoTabela(ind.setores, {
    setor: (s) => s.setor,
    usuarios: (s) => s.usuarios,
    acessaram: (s) => s.acessaram,
    adesao: (s) => (s.usuarios ? s.acessaram / s.usuarios : 0),
  });
  const usuariosTabela = useOrdenacaoTabela(filtrados, {
    nome: (u) => u.nome,
    setor: (u) => u.departamento ?? "Sem setor",
    situacao: (u) => situacao(u),
    ultimo: (u) => u.ultimo_acesso,
    dias: (u) => diasSemAcessar(u.ultimo_acesso),
    acessos30: (u) => u.acessos_30d,
    total: (u) => u.total_acessos,
  });

  async function exportar() {
    const XLSX = await import("xlsx");
    const linhas = filtrados.map((u) => ({
      Nome: u.nome, "E-mail": u.email, Setor: u.departamento ?? "Sem setor", "Situação": situacao(u),
      "Primeiro acesso": fmt(u.primeiro_acesso), "Último acesso": fmt(u.ultimo_acesso),
      "Dias sem acessar": diasSemAcessar(u.ultimo_acesso) ?? "", "Acessos (30 dias)": u.acessos_30d, "Total de acessos": u.total_acessos,
    }));
    const resumo = [
      { Indicador: `Período (dias)`, Valor: dias },
      { Indicador: "Profissionais ativos", Valor: ind.usuariosAtivos },
      { Indicador: "Acessaram no período", Valor: ind.acessaramNoPeriodo },
      { Indicador: "Adesão", Valor: pct(ind.adesao) },
      { Indicador: "Total de acessos", Valor: ind.totalAcessos },
      { Indicador: "Média de acessos por usuário", Valor: Number(ind.mediaPorUsuario.toFixed(1)) },
      { Indicador: "Nunca acessaram", Valor: ind.nuncaAcessaram },
    ];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(linhas);
    ws["!cols"] = [{ wch: 32 }, { wch: 34 }, { wch: 28 }, { wch: 14 }, { wch: 18 }, { wch: 18 }, { wch: 16 }, { wch: 16 }, { wch: 16 }];
    XLSX.utils.book_append_sheet(wb, ws, "Usuários");
    const wr = XLSX.utils.json_to_sheet(resumo); wr["!cols"] = [{ wch: 32 }, { wch: 14 }];
    XLSX.utils.book_append_sheet(wb, wr, "Resumo");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(ind.setores.map((s) => ({ Setor: s.setor, Profissionais: s.usuarios, "Acessaram": s.acessaram, "Adesão": pct(s.usuarios ? s.acessaram / s.usuarios : 0) }))), "Por setor");
    XLSX.writeFile(wb, `acessos-portal-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  const erro = usuariosQ.error || eventosQ.error;
  return <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-8">
    <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div><h1 className="text-3xl font-bold text-foreground">Relatórios de acesso</h1><p className="text-sm text-muted-foreground">Quem acessa o portal e com qual frequência.</p></div>
      <div className="flex gap-2">
        <Select value={periodo} onValueChange={setPeriodo}><SelectTrigger className="w-40" aria-label="Período"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="7">Últimos 7 dias</SelectItem><SelectItem value="30">Últimos 30 dias</SelectItem><SelectItem value="90">Últimos 90 dias</SelectItem></SelectContent></Select>
        <Button onClick={() => void exportar()} disabled={!usuarios.length}><Download /> Exportar XLSX</Button>
      </div>
    </header>
    {erro ? <p role="alert" className="border-l-2 border-destructive p-4 text-sm text-destructive">Não foi possível carregar os acessos.</p> :
    <Tabs defaultValue="painel">
      <TabsList><TabsTrigger value="painel">Painel</TabsTrigger><TabsTrigger value="usuarios">Usuários</TabsTrigger></TabsList>
      <TabsContent value="painel" className="space-y-6 pt-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {[["Profissionais ativos", ind.usuariosAtivos], ["Acessaram no período", ind.acessaramNoPeriodo], ["Adesão", pct(ind.adesao)], ["Total de acessos", ind.totalAcessos], ["Nunca acessaram", ind.nuncaAcessaram]].map(([l, v]) =>
            <div key={l} className="rounded-lg border bg-card p-4"><p className="text-xs font-semibold uppercase text-muted-foreground">{l}</p><p className="mt-1 text-3xl font-bold text-foreground">{v}</p></div>)}
        </div>
        <section className="rounded-lg border bg-card p-4"><h2 className="mb-3 font-bold text-foreground">Acessos por dia</h2>
          <div className="h-64"><ResponsiveContainer><LineChart data={ind.serie}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="dia" fontSize={11} /><YAxis allowDecimals={false} fontSize={11} /><Tooltip /><Line type="monotone" dataKey="acessos" name="Acessos" stroke={COR} strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer></div></section>
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-lg border bg-card p-4"><h2 className="mb-3 font-bold text-foreground">Dias da semana</h2>
            <div className="h-56"><ResponsiveContainer><BarChart data={ind.semana}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="dia" fontSize={11} /><YAxis allowDecimals={false} fontSize={11} /><Tooltip /><Bar dataKey="acessos" name="Acessos" fill={COR} /></BarChart></ResponsiveContainer></div></section>
          <section className="rounded-lg border bg-card p-4"><h2 className="mb-3 font-bold text-foreground">Quem mais acessou</h2>
            {ind.top.length === 0 ? <p className="text-sm text-muted-foreground">Sem acessos no período.</p> :
            <ol className="space-y-2">{ind.top.map((t, i) => <li key={t.nome + i} className="flex justify-between gap-2 border-b pb-2 text-sm"><span><b>{i + 1}.</b> {t.nome} <span className="text-muted-foreground">· {t.setor}</span></span><b>{t.acessos}</b></li>)}</ol>}</section>
        </div>
        <section className="rounded-lg border bg-card p-4"><h2 className="mb-3 font-bold text-foreground">Adesão por setor</h2>
          <Table><TableHeader><TableRow>
            <TableHeadOrdenavel coluna="setor" ordenacao={setoresTabela.ordenacao} onOrdenar={setoresTabela.alternar}>Setor</TableHeadOrdenavel>
            <TableHeadOrdenavel coluna="usuarios" ordenacao={setoresTabela.ordenacao} onOrdenar={setoresTabela.alternar}>Profissionais</TableHeadOrdenavel>
            <TableHeadOrdenavel coluna="acessaram" ordenacao={setoresTabela.ordenacao} onOrdenar={setoresTabela.alternar}>Acessaram</TableHeadOrdenavel>
            <TableHeadOrdenavel coluna="adesao" ordenacao={setoresTabela.ordenacao} onOrdenar={setoresTabela.alternar}>Adesão</TableHeadOrdenavel>
          </TableRow></TableHeader>
            <TableBody>{setoresTabela.itens.map((s) => <TableRow key={s.setor}><TableCell className="font-semibold">{s.setor}</TableCell><TableCell>{s.usuarios}</TableCell><TableCell>{s.acessaram}</TableCell><TableCell>{pct(s.usuarios ? s.acessaram / s.usuarios : 0)}</TableCell></TableRow>)}</TableBody></Table></section>
      </TabsContent>
      <TabsContent value="usuarios" className="pt-4">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="relative w-full sm:max-w-xs"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input aria-label="Buscar profissional" placeholder="Buscar nome ou e-mail" value={busca} onChange={(e) => setBusca(e.target.value)} className="pl-9" /></div>
          <Select value={setor} onValueChange={setSetor}><SelectTrigger className="w-56" aria-label="Setor"><SelectValue /></SelectTrigger><SelectContent><SelectItem value={TODOS}>Todos os setores</SelectItem>{setores.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
          <Select value={sit} onValueChange={setSit}><SelectTrigger className="w-44" aria-label="Situação"><SelectValue /></SelectTrigger><SelectContent><SelectItem value={TODOS}>Todas as situações</SelectItem><SelectItem value="Ativo">Ativo</SelectItem><SelectItem value="Nunca acessou">Nunca acessou</SelectItem><SelectItem value="Inativo">Inativo</SelectItem></SelectContent></Select>
          <span className="ml-auto text-sm text-muted-foreground">{usuariosTabela.itens.length} profissionais</span>
        </div>
        <Table>
          <TableHeader><TableRow>
            <TableHeadOrdenavel coluna="nome" ordenacao={usuariosTabela.ordenacao} onOrdenar={usuariosTabela.alternar}>Nome</TableHeadOrdenavel>
            <TableHeadOrdenavel coluna="setor" ordenacao={usuariosTabela.ordenacao} onOrdenar={usuariosTabela.alternar}>Setor</TableHeadOrdenavel>
            <TableHeadOrdenavel coluna="situacao" ordenacao={usuariosTabela.ordenacao} onOrdenar={usuariosTabela.alternar}>Situação</TableHeadOrdenavel>
            <TableHeadOrdenavel coluna="ultimo" ordenacao={usuariosTabela.ordenacao} onOrdenar={usuariosTabela.alternar}>Último acesso</TableHeadOrdenavel>
            <TableHeadOrdenavel coluna="dias" ordenacao={usuariosTabela.ordenacao} onOrdenar={usuariosTabela.alternar}>Dias sem acessar</TableHeadOrdenavel>
            <TableHeadOrdenavel coluna="acessos30" ordenacao={usuariosTabela.ordenacao} onOrdenar={usuariosTabela.alternar}>Acessos (30 dias)</TableHeadOrdenavel>
            <TableHeadOrdenavel coluna="total" ordenacao={usuariosTabela.ordenacao} onOrdenar={usuariosTabela.alternar}>Total</TableHeadOrdenavel>
          </TableRow></TableHeader>
          <TableBody>{usuariosTabela.itens.map((u) => <TableRow key={u.usuario_id}>
            <TableCell className="min-w-48"><div className="font-semibold">{u.nome}</div><div className="text-xs text-muted-foreground">{u.email}</div></TableCell>
            <TableCell>{u.departamento ?? "Sem setor"}</TableCell>
            <TableCell className="whitespace-nowrap">{situacao(u)}</TableCell>
            <TableCell className="whitespace-nowrap">{fmt(u.ultimo_acesso)}</TableCell>
            <TableCell>{diasSemAcessar(u.ultimo_acesso) ?? "—"}</TableCell>
            <TableCell>{u.acessos_30d}</TableCell>
            <TableCell>{u.total_acessos}</TableCell>
          </TableRow>)}</TableBody>
        </Table>
      </TabsContent>
    </Tabs>}
  </main>;
}
