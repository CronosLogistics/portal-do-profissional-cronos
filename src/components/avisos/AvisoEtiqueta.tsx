import { AlertTriangle } from "lucide-react";

export function AvisoEtiqueta({ importante, confirmado = false }: { importante?: boolean | undefined; confirmado?: boolean }) {
  return <span className={importante ? "inline-flex items-center gap-1 rounded border border-accent bg-accent px-2 py-0.5 text-xs font-bold text-primary-foreground" : "aviso-tag-obrigatoria"}>
    {importante && <AlertTriangle className="size-3 shrink-0" aria-hidden="true" />}
    {importante ? "IMPORTANTE" : "Leitura obrigatória"}{confirmado ? " · confirmada" : ""}
  </span>;
}