import { createFileRoute, redirect } from '@tanstack/react-router';
import { queryOptions, useSuspenseQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Download, ShieldCheck } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { acessoFelizometro, consultarPainelHumor } from '@/lib/felizometro-client';
import { pulsoDoDia, SENTIMENTOS } from '@/lib/felizometro.rules';
import { filtrarDias, limitesMes, META_HUMOR_POSITIVO, participacaoEstimada, percentual, resumoHumor, temasRelatos, tendenciaHumor, type DiaHumor, type MomentoHumor } from '@/lib/painel-humor.rules';

const mesAtual = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit' }).format(new Date()).slice(0, 7);
const opcoes = (mes: string) => queryOptions({
  queryKey: ['painel-felizometro', mes],
  queryFn: async () => {
    const { inicio, fim, anterior } = limitesMes(mes);
    const data = new Date(`${fim}T12:00:00Z`); data.setUTCDate(data.getUTCDate() - 48);
    const desde = [data.toISOString().slice(0, 10), `${anterior}-01`].sort()[0] ?? inicio;
    const [atual, historico] = await Promise.all([consultarPainelHumor(inicio, fim), consultarPainelHumor(desde, fim)]);
    return { atual, historico };
  }, staleTime: 60_000,
});
export const Route = createFileRoute('/_authenticated/relatorios-humor')({
  beforeLoad: async () => { if (!(await acessoFelizometro())) throw redirect({ to: '/' }); },
  loader: ({ context }) => context.queryClient.ensureQueryData(opcoes(mesAtual())),
  head: () => ({ meta: [
    { title: 'Painel Pulso Cronos — Felizômetro | Portal do Profissional' },
    { name: 'description', content: 'Painel anônimo de bem-estar da Cronos, com participação, distribuição de sentimentos e comparativo semanal.' },
    { property: 'og:title', content: 'Painel Pulso Cronos — Felizômetro' },
    { property: 'og:description', content: 'Indicadores consolidados do início e fechamento da semana, exclusivos para Gestão de Pessoas e administradores.' },
    { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' }, { name: 'robots', content: 'noindex' },
  ] }),
  errorComponent: ({ error, reset }) => <main className="space-y-4"><h1 className="text-2xl font-bold">Felizômetro</h1><p role="alert" className="text-destructive">{error instanceof Error ? error.message : 'Não foi possível carregar o painel.'}</p><Button onClick={reset} variant="outline">Tentar novamente</Button></main>,
  component: RelatoriosHumor,
});
const numero = (n: number | null) => n === null ? '—' : n.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
const porcento = (n: number | null) => n === null ? '—' : `${n.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
const dataCurta = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString('pt-BR', { timeZone: 'UTC', day: '2-digit', month: '2-digit' });
function Distribuicao({ dias }: { dias: DiaHumor[] }) {
  const resumo = resumoHumor(dias);
  return <div className="space-y-4">{SENTIMENTOS.map(item => <div key={item.valor}>
    <div className="mb-1.5 flex justify-between gap-3 text-xs"><span>{item.emoji} {item.nome}</span><span className="font-bold tabular-nums">{porcento(percentual(resumo[item.chave], resumo.total))}</span></div>
    <meter className="humor-meter" data-tone={item.chave} min={0} max={100} value={percentual(resumo[item.chave], resumo.total) ?? 0} aria-label={`${item.nome}: ${resumo[item.chave]} respostas`} />
  </div>)}{resumo.neutro_legado > 0 && <p className="text-xs text-muted-foreground">Neutro (escala anterior): {porcento(percentual(resumo.neutro_legado, resumo.total))}. Não compõe a média de quatro níveis.</p>}</div>;
}
function RelatoriosHumor() {
  const [mes, setMes] = useState(mesAtual);
  const [momento, setMomento] = useState<MomentoHumor>('todos');
  const { data } = useSuspenseQuery(opcoes(mes));
  const { inicio, fim, anterior } = limitesMes(mes);
  const dias = filtrarDias(data.atual.dias, mes, momento);
  const resumo = resumoHumor(dias);
  const passada = resumoHumor(filtrarDias(data.historico.dias, anterior, momento));
  const variacao = resumo.positivo !== null && passada.positivo !== null ? resumo.positivo - passada.positivo : null;
  const segundaDias = dias.filter(d => pulsoDoDia(d.dia) === 'segunda');
  const sextaDias = dias.filter(d => pulsoDoDia(d.dia) === 'sexta');
  const segunda = resumoHumor(segundaDias), sexta = resumoHumor(sextaDias);
  const desgaste = segunda.media !== null && sexta.media !== null ? sexta.media - segunda.media : null;
  const participacao = participacaoEstimada(inicio, fim, data.atual.hoje, data.atual.ativos, resumo.total, momento);
  const tendencia = tendenciaHumor(data.historico.dias.filter(d => momento === 'todos' || pulsoDoDia(d.dia) === momento));
  const temas = temasRelatos(data.atual.relatos);
  function exportar() {
    const celula = (v: unknown) => `"${String(v).replaceAll('"', '""')}"`;
    const linhas = [['Data', 'Pulso', 'Respostas', 'Muito bem', 'Tranquilo', 'Desanimado', 'Estressado', 'Neutro (legado)', 'Média / 4'], ...dias.map(d => [d.dia, pulsoDoDia(d.dia), d.total, d.muito_bem, d.tranquilo, d.desanimado, d.estressado, d.neutro_legado, numero(resumoHumor([d]).media)])];
    const url = URL.createObjectURL(new Blob(['\uFEFF' + linhas.map(l => l.map(celula).join(';')).join('\r\n')], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = `pulso-cronos-${mes}-${momento}.csv`; link.click(); URL.revokeObjectURL(url);
  }
  return <main className="humor-dashboard min-w-0 space-y-6">
    <header className="flex flex-wrap items-center justify-between gap-5 border-t-2 border-primary pt-5">
      <div className="min-w-0"><div className="flex flex-wrap items-center gap-3"><h1 className="text-xl font-bold">Painel Pulso Cronos — Felizômetro</h1><span className="flex items-center gap-1 text-xs font-bold text-secondary"><ShieldCheck className="size-3.5" />100% Anônimo</span></div><p className="mt-2 text-xs text-muted-foreground">Visão consolidada da empresa — sem identificação de usuário, gestor ou departamento</p></div>
      <div className="flex flex-wrap items-end gap-3">
        <label className="space-y-1 text-xs text-muted-foreground">PERÍODO<Input aria-label="Período" type="month" value={mes} onChange={e => { if (/^\d{4}-\d{2}$/.test(e.target.value)) setMes(e.target.value); }} className="w-40 text-foreground" /></label>
        <div className="w-48 space-y-1"><label id="momento-pulso" className="text-xs text-muted-foreground">MOMENTO DO PULSO</label><Select value={momento} onValueChange={v => { if (v === 'todos' || v === 'segunda' || v === 'sexta') setMomento(v); }}><SelectTrigger aria-labelledby="momento-pulso"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="todos">Todos (Seg + Sex)</SelectItem><SelectItem value="segunda">Segunda-feira (Início)</SelectItem><SelectItem value="sexta">Sexta-feira (Fechamento)</SelectItem></SelectContent></Select></div>
        <Button variant="outline" size="icon" title="Exportar CSV" aria-label="Exportar CSV" disabled={!resumo.total} onClick={exportar}><Download className="size-4" /></Button>
      </div>
    </header>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div className="humor-kpi"><h2 className="text-xs font-bold text-muted-foreground">Índice de Humor Positivo</h2><p className="mt-3 text-3xl font-bold tabular-nums">{porcento(resumo.positivo)}</p><p className="mt-2 text-xs text-muted-foreground">Meta RH: ≥ {META_HUMOR_POSITIVO}% · 🤩 + 😊</p>{variacao !== null && <p className="mt-2 text-xs font-bold text-secondary">{variacao > 0 ? '+' : ''}{numero(variacao)} p.p. vs. mês anterior</p>}</div>
      <div className="humor-kpi" data-kpi="participacao"><h2 className="text-xs font-bold text-muted-foreground">Taxa de Participação</h2><p className="mt-3 text-3xl font-bold tabular-nums">{resumo.total ? porcento(participacao.taxa) : '—'}</p><p className="mt-2 text-xs text-muted-foreground">{resumo.total} respostas disponíveis · {participacao.pulsos} pulsos encerrados</p><p className="mt-2 text-xs text-muted-foreground" title="Respostas disponíveis ÷ (quadro ativo atual × pulsos encerrados). Grupos ocultos não entram no numerador.">Estimativa sobre o quadro ativo atual</p></div>
      <div className="humor-kpi" data-kpi="desgaste"><h2 className="text-xs font-bold text-muted-foreground">Desgaste Semanal (Seg → Sex)</h2><p className="mt-3 text-3xl font-bold tabular-nums">{numero(desgaste)}</p><p className="mt-2 text-xs text-muted-foreground">Escala de 1 a 4 · {numero(segunda.media)} → {numero(sexta.media)}</p><p className="mt-2 text-xs text-muted-foreground">Comparativo das médias do período</p></div>
      <div className="humor-kpi" data-kpi="alerta"><h2 className="text-xs font-bold text-muted-foreground">Taxa de Alerta Crítico</h2><p className="mt-3 text-3xl font-bold tabular-nums">{porcento(resumo.alerta)}</p><p className="mt-2 text-xs text-muted-foreground">😟 Desanimado ou 😤 Estressado</p><p className="mt-2 text-xs font-bold text-destructive">{resumo.desanimado + resumo.estressado} respostas</p></div>
    </div>
    {!resumo.total && <div role="status" className="border-l-2 border-primary bg-muted/50 px-4 py-3 text-sm"><p className="font-bold">Ainda não há resultados disponíveis neste período</p><p className="mt-1 text-xs text-muted-foreground">Resultados são liberados após encerrar o dia, com pelo menos 5 respostas por setor e pulso.</p></div>}
    <div className="grid gap-7 lg:grid-cols-[1.2fr_1fr]">
      <section className="humor-panel"><h2 className="text-sm font-bold">Termômetro da Semana: Segunda-feira vs. Sexta-feira</h2><p className="mt-1 text-xs text-muted-foreground">Comparativo consolidado de energia no início e no fechamento da semana</p>
        <div className="mt-5 grid gap-6 sm:grid-cols-2">{[{ nome: 'Segunda-feira (Início)', resumo: segunda, dias: segundaDias }, { nome: 'Sexta-feira (Fechamento)', resumo: sexta, dias: sextaDias }].map(item => <div key={item.nome}><div className="mb-5 flex flex-wrap justify-between gap-2 text-xs font-bold"><h3>{item.nome}</h3><span className="text-secondary">Média {numero(item.resumo.media)}</span></div><Distribuicao dias={item.dias} /></div>)}</div>
        <p className="mt-5 text-xs text-muted-foreground">As amostras podem ter participantes diferentes; a variação indica uma tendência coletiva.</p>
      </section>
      <section className="humor-panel"><h2 className="text-sm font-bold">Distribuição Geral das Respostas</h2><p className="mb-5 mt-1 text-xs text-muted-foreground">Proporção por sentimento no filtro selecionado</p><Distribuicao dias={dias} /></section>
    </div>
    <div className="grid gap-7 lg:grid-cols-2">
      <section className="humor-panel"><h2 className="text-sm font-bold">Evolução do Índice Positivo (% Semanal)</h2><p className="mt-1 text-xs text-muted-foreground">Últimas seis semanas disponíveis até o período selecionado</p><div className="mt-5 h-56 min-w-0">{tendencia.length ? <ResponsiveContainer width="100%" height="100%"><AreaChart data={tendencia} margin={{ top: 10, right: 12, left: -16, bottom: 0 }}><CartesianGrid stroke="var(--border)" vertical={false} /><XAxis dataKey="semana" tickFormatter={dataCurta} stroke="var(--muted-foreground)" fontSize={11} /><YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} stroke="var(--muted-foreground)" fontSize={11} /><Tooltip labelFormatter={v => `Semana de ${dataCurta(String(v))}`} formatter={v => [porcento(typeof v === 'number' ? v : null), 'Índice positivo']} contentStyle={{ background: 'var(--popover)', borderColor: 'var(--border)', color: 'var(--foreground)' }} /><ReferenceLine y={META_HUMOR_POSITIVO} stroke="var(--humor-calm)" strokeDasharray="4 4" label={{ value: 'Meta 80%', position: 'insideTopRight', fill: 'var(--muted-foreground)', fontSize: 10 }} /><Area type="linear" dataKey="positivo" stroke="var(--primary)" fill="var(--primary)" fillOpacity={0.07} strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} /></AreaChart></ResponsiveContainer> : <div className="flex h-full items-center justify-center text-xs text-muted-foreground">Sem histórico disponível para exibir.</div>}</div></section>
      <section className="humor-panel"><h2 className="text-sm font-bold">Radar de Atenção — Temas Citados (Anônimo)</h2><p className="mb-5 mt-1 text-xs text-muted-foreground">Relatos opcionais do mês, sem vínculo de área ou sentimento</p>{temas.length ? <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Tema</TableHead><TableHead>Assuntos citados</TableHead><TableHead className="text-right">Menções</TableHead></TableRow></TableHeader><TableBody>{temas.map(t => <TableRow key={t.nome}><TableCell className="text-xs font-bold text-secondary">{t.nome}</TableCell><TableCell className="text-xs">{t.sintese}</TableCell><TableCell className="text-right text-xs font-bold">{t.mencoes}</TableCell></TableRow>)}</TableBody></Table></div> : <p className="py-8 text-center text-xs text-muted-foreground">Nenhum tema recorrente identificado neste período.</p>}<p className="mt-4 text-xs text-muted-foreground">Agrupamento por palavras-chave. Um relato pode mencionar mais de um tema; não é uma avaliação individual.</p></section>
    </div>
    <section className="humor-panel"><details><summary className="cursor-pointer text-sm font-bold">Relatos anônimos do mês ({data.atual.relatos.length})</summary><p className="mt-2 text-xs text-muted-foreground">Sem vínculo com o filtro de momento, área, autoria ou ordem de envio.</p>{data.atual.relatos.length ? <ul className="mt-3 divide-y">{data.atual.relatos.map((texto, i) => <li key={i} className="whitespace-pre-wrap break-words py-4 text-sm">{texto}</li>)}</ul> : <p className="mt-4 text-xs text-muted-foreground">Nenhum relato disponível.</p>}</details></section>
    <footer className="flex items-start gap-2 border-t pt-4 text-xs leading-relaxed text-muted-foreground"><ShieldCheck className="size-4 shrink-0" /><p>Pesquisa anônima. Nenhum nome, gestor, setor ou horário individual é exibido. Grupos pequenos e pulsos ainda abertos ficam ocultos; os indicadores consideram apenas resultados liberados.</p></footer>
  </main>;
}
