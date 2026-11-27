import { pulsoDoDia } from './felizometro.rules';

export type DiaHumor = { dia: string; total: number; muito_bem: number; tranquilo: number; desanimado: number; estressado: number; neutro_legado: number };
export type PainelHumor = { dias: DiaHumor[]; relatos: string[]; ativos: number; hoje: string; ultima_atualizacao: string; proxima_atualizacao: string };
export type MomentoHumor = 'todos' | 'segunda' | 'sexta';
export const META_HUMOR_POSITIVO = 80;
export const percentual = (parte: number, total: number): number | null => total ? parte / total * 100 : null;
export function resumoHumor(dias: DiaHumor[]) {
  const soma = (chave: keyof Omit<DiaHumor, 'dia'>) => dias.reduce((n, d) => n + d[chave], 0);
  const total = soma('total');
  const muito_bem = soma('muito_bem'), tranquilo = soma('tranquilo'), desanimado = soma('desanimado'), estressado = soma('estressado'), neutro_legado = soma('neutro_legado');
  const classificados = total - neutro_legado;
  return { total, muito_bem, tranquilo, desanimado, estressado, neutro_legado, media: classificados ? (muito_bem * 4 + tranquilo * 3 + desanimado * 2 + estressado) / classificados : null, positivo: percentual(muito_bem + tranquilo, total), alerta: percentual(desanimado + estressado, total) };
}
export function limitesMes(mes: string) {
  const data = new Date(`${mes}-01T12:00:00Z`);
  const fim = new Date(Date.UTC(data.getUTCFullYear(), data.getUTCMonth() + 1, 0, 12)).toISOString().slice(0, 10);
  const anterior = new Date(Date.UTC(data.getUTCFullYear(), data.getUTCMonth() - 1, 1, 12)).toISOString().slice(0, 7);
  return { inicio: `${mes}-01`, fim, anterior };
}
export function filtrarDias(dias: DiaHumor[], mes: string, momento: MomentoHumor) {
  return dias.filter(d => d.dia.startsWith(mes) && (momento === 'todos' || pulsoDoDia(d.dia) === momento));
}
export function participacaoEstimada(inicio: string, fim: string, hoje: string, ativos: number, respostas: number, momento: MomentoHumor) {
  let pulsos = 0;
  for (const data = new Date(`${inicio}T12:00:00Z`); data.toISOString().slice(0, 10) <= fim && data.toISOString().slice(0, 10) < hoje; data.setUTCDate(data.getUTCDate() + 1)) {
    const pulso = pulsoDoDia(data.toISOString().slice(0, 10));
    if (pulso && (momento === 'todos' || pulso === momento)) pulsos++;
  }
  return { pulsos, taxa: percentual(respostas, pulsos * ativos) };
}
export function tendenciaHumor(dias: DiaHumor[]) {
  const semanas = new Map<string, DiaHumor[]>();
  for (const dia of dias) {
    const data = new Date(`${dia.dia}T12:00:00Z`);
    if (pulsoDoDia(dia.dia) === 'sexta') data.setUTCDate(data.getUTCDate() - 4);
    const chave = data.toISOString().slice(0, 10);
    semanas.set(chave, [...(semanas.get(chave) ?? []), dia]);
  }
  return [...semanas].sort(([a], [b]) => a.localeCompare(b)).slice(-6).map(([semana, itens]) => ({ semana, positivo: resumoHumor(itens).positivo }));
}
const TEMAS = [
  { nome: 'Volume / Demanda', sintese: 'Demandas, carga de trabalho e prazos', termos: /demanda|sobrecarga|acumul|volume|prazo|carga de trabalho/i },
  { nome: 'Fluxo e Processos', sintese: 'Processos, aprovações e etapas internas', termos: /process|aprova|fluxo|etapa|retrabalho/i },
  { nome: 'Comunicação', sintese: 'Comunicação e alinhamento da equipe', termos: /comunica|alinhamento|conversa|reuni[aã]o/i },
  { nome: 'Sistemas / TI', sintese: 'Sistemas, ferramentas e suporte técnico', termos: /sistema|ferramenta|lentid[aã]o|computador|suporte|internet/i },
] as const;
export function temasRelatos(relatos: string[]) {
  return TEMAS.map(t => ({ nome: t.nome, sintese: t.sintese, mencoes: relatos.filter(r => t.termos.test(r)).length })).filter(t => t.mencoes > 0);
}
