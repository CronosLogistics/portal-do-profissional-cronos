import { describe, expect, it } from 'vitest';
import { SENTIMENTOS } from '@/lib/felizometro.rules';
import { filtrarDias, participacaoEstimada, resumoHumor, temasRelatos, tendenciaHumor, type DiaHumor } from '@/lib/painel-humor.rules';
const dia: DiaHumor = { dia: '2026-11-23', total: 10, muito_bem: 4, tranquilo: 4, desanimado: 1, estressado: 1, neutro_legado: 0 };
describe('painel de quatro sentimentos', () => {
  it('oferece somente quatro valores de resposta de 1 a 4', () => {
    expect(SENTIMENTOS.map(s => s.valor)).toEqual([4, 3, 2, 1]);
  });
  it('calcula positivos, alertas e média ponderada em quatro níveis', () => {
    expect(resumoHumor([dia])).toMatchObject({ total: 10, positivo: 80, alerta: 20, media: 3.1 });
    expect(resumoHumor([])).toMatchObject({ positivo: null, alerta: null, media: null });
  });
  it('preserva neutros anteriores sem atribuir-lhes outro sentimento', () => {
    expect(resumoHumor([{ ...dia, total: 12, neutro_legado: 2 }])).toMatchObject({ total: 12, neutro_legado: 2, media: 3.1 });
  });
  it('filtra o mês e o momento sem incluir respostas de outro pulso', () => {
    const sexta = { ...dia, dia: '2026-11-27' };
    expect(filtrarDias([dia, sexta, { ...dia, dia: '2026-10-26' }], '2026-11', 'sexta')).toEqual([sexta]);
  });
  it('estima participação só com pulsos encerrados no horário de Brasília', () => {
    expect(participacaoEstimada('2026-11-23', '2026-11-27', '2026-11-27', 20, 10, 'todos')).toEqual({ pulsos: 1, taxa: 50 });
    expect(participacaoEstimada('2026-11-23', '2026-11-27', '2026-11-28', 20, 10, 'todos')).toEqual({ pulsos: 2, taxa: 25 });
    expect(participacaoEstimada('2026-11-23', '2026-11-27', '2026-11-27', 20, 0, 'sexta')).toEqual({ pulsos: 0, taxa: null });
  });
  it('une segunda e sexta na mesma semana', () => {
    expect(tendenciaHumor([dia, { ...dia, dia: '2026-11-27', muito_bem: 0, tranquilo: 0, desanimado: 5, estressado: 5 }])).toEqual([{ semana: '2026-11-23', positivo: 40 }]);
  });
  it('conta temas por relato sem inventar menções nem repetir ocorrências', () => {
    expect(temasRelatos(['Demanda acumulada, muita demanda', 'Problema no sistema', 'Tudo bem'])).toEqual([
      { nome: 'Volume / Demanda', sintese: 'Demandas, carga de trabalho e prazos', mencoes: 1 },
      { nome: 'Sistemas / TI', sintese: 'Sistemas, ferramentas e suporte técnico', mencoes: 1 },
    ]);
  });
});
