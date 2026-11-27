import { createFileRoute, redirect } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Download, ShieldCheck } from "lucide-react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { acessoFelizometro, consultarRelatorioHumor } from "@/lib/felizometro-client";
import { comparativoSemanal, mediaHumor, pulsoDoDia, SENTIMENTOS } from "@/lib/felizometro.rules";

function datasPadrao() {
  const fim = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const data = new Date(`${fim}T12:00:00Z`);
  data.setUTCDate(data.getUTCDate() - 30);
  return { inicio: data.toISOString().slice(0, 10), fim };
}
const opcoes = (inicio: string, fim: string) => queryOptions({ queryKey: ["relatorio-felizometro", inicio, fim], queryFn: () => consultarRelatorioHumor(inicio, fim), staleTime: 60_000 });
export const Route = createFileRoute("/_authenticated/relatorios-humor")({
  beforeLoad: async () => { if (!(await acessoFelizometro())) throw redirect({ to: "/" }); },
  loader: ({ context }) => { const { inicio, fim } = datasPadrao(); return context.queryClient.ensureQueryData(opcoes(inicio, fim)); },
  head: () => ({ meta: [
    { title: "Felizômetro — Pulso Semanal | Portal do Profissional Cronos" },
    { name: "description", content: "Relatório anônimo do pulso semanal da equipe Cronos, exclusivo para Gestão de Pessoas e administradores." },
    { property: "og:title", content: "Felizômetro | Portal do Profissional Cronos" },
    { property: "og:description", content: "Indicadores anônimos de bem-estar no início e no fechamento da semana." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" },
  ] }),
  errorComponent: ({ error, reset }) => <main className="space-y-4"><h1 className="text-2xl font-bold">Felizômetro</h1><p role="alert" className="text-destructive">{error instanceof Error ? error.message : "Não foi possível carregar o relatório."}</p><Button onClick={reset} variant="outline">Tentar novamente</Button></main>,
  component: RelatoriosHumor,
});
const formatarData = (dia: string) => new Date(`${dia}T12:00:00Z`).toLocaleDateString("pt-BR", { timeZone: "UTC" });
const nota = (valor: number | null) => valor === null ? "—" : valor.toLocaleString("pt-BR", { maximumFractionDigits: 2 });

function RelatoriosHumor() {
  const [periodo, setPeriodo] = useState(datasPadrao);
  const [inicio, setInicio] = useState(periodo.inicio);
  const [fim, setFim] = useState(periodo.fim);
  const [setor, setSetor] = useState("__todos");
  const [erro, setErro] = useState("");
  const { data } = useSuspenseQuery(opcoes(periodo.inicio, periodo.fim));
  const setores = [...new Set(data.grupos.map(g => g.setor))].sort();
  const grupos = data.grupos.filter(g => setor === "__todos" || g.setor === setor);
  const total = grupos.reduce((soma, g) => soma + g.total, 0);
  const segunda = mediaHumor(grupos.filter(g => pulsoDoDia(g.dia) === "segunda"));
  const sexta = mediaHumor(grupos.filter(g => pulsoDoDia(g.dia) === "sexta"));
  const semanas = comparativoSemanal(grupos);
  const distribuicao = ["muito_dificil", "desanimado", "neutro", "tranquilo", "muito_bem"] as const;
  function exportar() {
    const escapar = (valor: unknown) => `"${String(valor).replaceAll('"', '""')}"`;
    const linhas = [["Data", "Pulso", "Setor", "Respostas", "Média", "Muito difícil", "Desanimado", "Neutro", "Tranquilo", "Muito bem"], ...grupos.map(g => [formatarData(g.dia), pulsoDoDia(g.dia), g.setor, g.total, nota(g.media), ...distribuicao.map(chave => g[chave])])];
    const url = URL.createObjectURL(new Blob(["\uFEFF" + linhas.map(l => l.map(escapar).join(";")).join("\r\n")], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = `felizometro-${periodo.inicio}-${periodo.fim}.csv`; link.click(); URL.revokeObjectURL(url);
  }
  return <main className="space-y-7">
    <header className="portal-page-heading flex flex-wrap items-start justify-between gap-4"><div><h1>Felizômetro</h1><p>Pulso Semanal · Bem-estar do time</p></div><Button variant="outline" onClick={exportar} disabled={!total}><Download className="size-4" />Exportar CSV</Button></header>
    <div className="flex items-start gap-3 border-l-2 border-primary bg-muted/50 p-4 text-sm"><ShieldCheck className="mt-0.5 size-5 shrink-0 text-secondary" /><p>Pesquisa anônima. Os resultados são liberados após o encerramento do dia, apenas para setores com pelo menos 5 respostas por pulso. Relatos não exibem setor, data individual ou autoria.</p></div>
    <form className="flex flex-wrap items-end gap-4" onSubmit={event => {
      event.preventDefault();
      const dias = (Date.parse(fim) - Date.parse(inicio)) / 86400000;
      if (!inicio || !fim || dias < 0 || dias > 366) { setErro("Selecione um período válido de até 366 dias."); return; }
      setErro(""); setSetor("__todos"); setPeriodo({ inicio, fim });
    }}>
      <label className="space-y-1 text-sm">De<Input aria-label="Data inicial" type="date" required value={inicio} onChange={e => setInicio(e.target.value)} /></label>
      <label className="space-y-1 text-sm">Até<Input aria-label="Data final" type="date" required value={fim} onChange={e => setFim(e.target.value)} /></label>
      <div className="w-64 max-w-full space-y-1"><label className="text-sm" id="setor-humor">Setor</label><Select value={setor} onValueChange={setSetor}><SelectTrigger aria-labelledby="setor-humor"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="__todos">Todos os setores</SelectItem>{setores.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
      <Button type="submit">Consultar</Button>
    </form>
    {erro && <p role="alert" className="text-sm text-destructive">{erro}</p>}
    <dl className="grid grid-cols-2 gap-5 border-y py-5 lg:grid-cols-4">
      {[{ nome: "Respostas disponíveis", valor: total }, { nome: "Média de segunda", valor: `${nota(segunda)} / 5` }, { nome: "Média de sexta", valor: `${nota(sexta)} / 5` }, { nome: "Variação sexta − segunda", valor: nota(segunda !== null && sexta !== null ? sexta - segunda : null) }].map(item => <div key={item.nome}><dt className="text-xs text-muted-foreground">{item.nome}</dt><dd className="mt-2 text-2xl font-bold">{item.valor}</dd></div>)}
    </dl>
    {!total ? <div className="py-10 text-center"><h2 className="font-bold">Ainda não há resultados disponíveis</h2><p className="mt-2 text-sm text-muted-foreground">Aguarde o encerramento dos pulsos e o mínimo de respostas para preservar o anonimato.</p></div> : <>
      <section><h2 className="mb-4 text-lg font-bold">Como o time está se sentindo</h2><div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">{SENTIMENTOS.map(item => {
        const chave = distribuicao[item.valor - 1];
        const quantidade = chave ? grupos.reduce((soma, g) => soma + g[chave], 0) : 0;
        return <div key={item.valor} className="rounded-md border p-4"><span className="text-2xl" aria-hidden="true">{item.emoji}</span><h3 className="mt-2 text-sm font-bold">{item.nome}</h3><p className="mt-1 text-xs text-muted-foreground">{quantidade} respostas · {Math.round(quantidade / total * 100)}%</p></div>;
      })}</div></section>
      <section><h2 className="mb-4 text-lg font-bold">Início e fechamento da semana</h2><div className="h-72 min-w-0"><ResponsiveContainer width="100%" height="100%"><LineChart data={semanas}><CartesianGrid stroke="var(--border)" vertical={false} /><XAxis dataKey="semana" tickFormatter={formatarData} stroke="var(--muted-foreground)" /><YAxis domain={[1, 5]} stroke="var(--muted-foreground)" /><Tooltip labelFormatter={v => `Semana de ${formatarData(String(v))}`} formatter={v => nota(typeof v === "number" ? v : null)} /><Legend /><Line type="monotone" dataKey="segunda" name="Segunda-feira" stroke="var(--secondary)" strokeWidth={2} connectNulls={false} /><Line type="monotone" dataKey="sexta" name="Sexta-feira" stroke="var(--primary)" strokeWidth={2} connectNulls={false} /></LineChart></ResponsiveContainer></div><p className="mt-2 text-xs text-muted-foreground">As amostras de segunda e sexta podem ter participantes diferentes; a variação indica uma tendência do grupo.</p></section>
      <section><h2 className="mb-3 text-lg font-bold">Resultados por setor e pulso</h2><Table><TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Pulso</TableHead><TableHead>Setor</TableHead><TableHead>Respostas</TableHead><TableHead>Média / 5</TableHead></TableRow></TableHeader><TableBody>{grupos.map(g => <TableRow key={`${g.dia}-${g.setor}`}><TableCell className="whitespace-nowrap">{formatarData(g.dia)}</TableCell><TableCell>{pulsoDoDia(g.dia) === "segunda" ? "Segunda" : "Sexta"}</TableCell><TableCell>{g.setor}</TableCell><TableCell>{g.total}</TableCell><TableCell>{nota(g.media)}</TableCell></TableRow>)}</TableBody></Table></section>
    </>}
    <section className="border-t pt-5"><h2 className="text-lg font-bold">Relatos anônimos do período</h2><p className="mt-1 text-xs text-muted-foreground">Sem vínculo com o filtro de setor, sentimentos ou ordem de envio.</p>{data.relatos.length ? <ul className="mt-4 divide-y">{data.relatos.map((texto, indice) => <li key={indice} className="whitespace-pre-wrap break-words py-4 text-sm">{texto}</li>)}</ul> : <p className="mt-4 text-sm text-muted-foreground">Nenhum relato disponível neste período.</p>}</section>
  </main>;
}