type Vinculo = {
  usuario_id: string;
  perfis: { departamento_sp_id: string | null; nivel_departamento: string | null } | null;
};
type Pessoa = { id: string; full_name: string | null; is_active: boolean | null };
type Relacao = { departamento_id: string; lider_id: string };

/** Resolve o gestor do perfil consultado, nunca pelo nível de quem está consultando. */
export function selecionarGestorPerfil(userId: string, relacoes: Relacao[], vinculos: Vinculo[], pessoas: Pessoa[]): string | null {
  const nivel = (id: string, departamento: string) => vinculos.find(v =>
    v.usuario_id === id && v.perfis?.departamento_sp_id === departamento,
  )?.perfis?.nivel_departamento;
  const candidatos = relacoes.flatMap(relacao => {
    const pessoa = pessoas.find(p => p.id === relacao.lider_id && p.id !== userId && p.is_active && p.full_name?.trim());
    if (!pessoa) return [];
    const nivelProfissional = nivel(userId, relacao.departamento_id);
    const ordem = nivelProfissional === "coordenador" || nivelProfissional === "lider"
      ? ["lider"]
      : nivelProfissional === "supervisor" ? ["coordenador", "lider"] : ["coordenador", "supervisor", "lider"];
    const prioridade = ordem.indexOf(nivel(relacao.lider_id, relacao.departamento_id) ?? "");
    return prioridade < 0 ? [] : [{ pessoa, prioridade }];
  });
  const nome = candidatos.sort((a, b) => a.prioridade - b.prioridade)[0]?.pessoa.full_name;
  return nome ? nome.replace(/\s*-\s*Cronos Logistics$/i, "").trim() : null;
}