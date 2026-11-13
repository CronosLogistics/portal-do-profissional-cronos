/** Regras puras do relatório de acessos (sem dependência de navegador ou banco). */
export type UsuarioAcesso = {
  usuario_id: string; nome: string; email: string; departamento: string | null; ativo: boolean;
  primeiro_acesso: string | null; ultimo_acesso: string | null; total_acessos: number; acessos_30d: number;
};
export type EventoAcesso = { usuario_id: string; acessado_em: string };

const DIA = 86_400_000;
const brDia = (iso: string) => new Date(new Date(iso).getTime() - 3 * 3600_000).toISOString().slice(0, 10);

export function diasSemAcessar(ultimo: string | null, agora = new Date()): number | null {
  if (!ultimo) return null;
  return Math.max(0, Math.round((Date.parse(brDia(agora.toISOString())) - Date.parse(brDia(ultimo))) / DIA));
}

export function situacao(u: Pick<UsuarioAcesso, "ativo" | "ultimo_acesso">): "Inativo" | "Nunca acessou" | "Ativo" {
  if (!u.ativo) return "Inativo";
  return u.ultimo_acesso ? "Ativo" : "Nunca acessou";
}

export const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export function indicadores(usuarios: UsuarioAcesso[], eventos: EventoAcesso[], periodoDias: number, agora = new Date()) {
  const ativos = usuarios.filter((u) => u.ativo);
  const ativosIds = new Set(ativos.map((u) => u.usuario_id));
  const doPeriodo = eventos.filter((e) => ativosIds.has(e.usuario_id));
  const unicos = new Set(doPeriodo.map((e) => e.usuario_id));
  const porDia = new Map<string, number>();
  for (let i = periodoDias - 1; i >= 0; i--) porDia.set(brDia(new Date(agora.getTime() - i * DIA).toISOString()), 0);
  const semana = DIAS_SEMANA.map((dia) => ({ dia, acessos: 0 }));
  const porUsuario = new Map<string, number>();
  for (const e of doPeriodo) {
    const d = brDia(e.acessado_em);
    if (porDia.has(d)) porDia.set(d, (porDia.get(d) ?? 0) + 1);
    semana[new Date(`${d}T12:00:00Z`).getUTCDay()]!.acessos++;
    porUsuario.set(e.usuario_id, (porUsuario.get(e.usuario_id) ?? 0) + 1);
  }
  const nomes = new Map(usuarios.map((u) => [u.usuario_id, u]));
  const setores = new Map<string, { setor: string; usuarios: number; acessaram: number }>();
  for (const u of ativos) {
    const setor = u.departamento ?? "Sem setor";
    const s = setores.get(setor) ?? { setor, usuarios: 0, acessaram: 0 };
    s.usuarios++; if (unicos.has(u.usuario_id)) s.acessaram++;
    setores.set(setor, s);
  }
  return {
    usuariosAtivos: ativos.length,
    acessaramNoPeriodo: unicos.size,
    adesao: ativos.length ? unicos.size / ativos.length : 0,
    totalAcessos: doPeriodo.length,
    mediaPorUsuario: unicos.size ? doPeriodo.length / unicos.size : 0,
    nuncaAcessaram: ativos.filter((u) => !u.ultimo_acesso).length,
    serie: [...porDia].map(([dia, acessos]) => ({ dia: dia.slice(8, 10) + "/" + dia.slice(5, 7), acessos })),
    semana,
    top: [...porUsuario].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id, acessos]) => ({ nome: nomes.get(id)?.nome ?? "—", setor: nomes.get(id)?.departamento ?? "Sem setor", acessos })),
    setores: [...setores.values()].sort((a, b) => b.acessaram - a.acessaram || a.setor.localeCompare(b.setor)),
  };
}
