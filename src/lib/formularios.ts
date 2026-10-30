/** Tipos e busca do cadastro de formulários. */
export type Formulario = { id: string; setor: string; titulo: string; codigo?: string; descricao?: string; acao: string; url: string; ordem: number };

const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

/** Filtra por setor e busca (sem acento), mantendo a ordem por setor. */
export function filtrarFormularios(formularios: Formulario[], busca: string, setor?: string) {
  const q = norm(busca.trim());
  return formularios.filter(
    (f) => (!setor || f.setor === setor) && (!q || norm(`${f.titulo} ${f.codigo ?? ""} ${f.descricao ?? ""} ${f.acao} ${f.setor}`).includes(q)),
  );
}

