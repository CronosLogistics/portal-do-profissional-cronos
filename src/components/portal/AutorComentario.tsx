import { Link } from "@tanstack/react-router";

import { useFotoProfissional } from "@/hooks/use-minha-foto";

const iniciais = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "?";

/** Foto Microsoft (ou iniciais) + nome clicável que leva ao perfil do autor. */
export function AutorComentario({ usuarioId, nome: bruto }: { usuarioId: string; nome: string }) {
  const nome = bruto.replace(/\s*-\s*Cronos Logistics$/i, "").trim() || bruto;
  const foto = useFotoProfissional(usuarioId);
  return (
    <Link to="/perfil/$id" params={{ id: usuarioId }} className="group flex min-w-0 items-center gap-2">
      <span className="grid size-8 shrink-0 place-items-center overflow-hidden rounded-full bg-primary/10 text-xs font-bold text-primary">
        {foto ? <img src={foto} alt="" className="size-full object-cover" /> : iniciais(nome)}
      </span>
      <span className="truncate text-sm font-semibold text-foreground group-hover:text-accent group-hover:underline">{nome}</span>
    </Link>
  );
}
