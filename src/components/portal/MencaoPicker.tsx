import { useEffect, useState } from "react";
import { AtSign, Building2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { buscarMencionaveis, consultaMencaoAtiva, partesMencao, type Mencionavel } from "@/lib/mencoes";

/** "@" button: search people or departments and hand back the chosen one. */
export function MencaoPicker({ onSelect, open: openProp, onOpenChange, consulta }: {
  onSelect: (m: Mencionavel) => void;
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
  /** When set (including ""), filters from the live @query typed in the field/editor. */
  consulta?: string | null;
}) {
  const [openLocal, setOpenLocal] = useState(false);
  const open = openProp ?? openLocal;
  const setOpen = onOpenChange ?? setOpenLocal;
  const [busca, setBusca] = useState("");
  const [itens, setItens] = useState<Mencionavel[]>([]);
  const termo = consulta ?? busca;
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => { buscarMencionaveis(termo).then(setItens).catch(() => setItens([])); }, 200);
    return () => clearTimeout(t);
  }, [termo, open]);
  useEffect(() => {
    if (!open) setBusca("");
  }, [open]);
  return (
    // modal: inside Dialog (AvisoForm), remove-scroll blocks wheel on portaled content otherwise
    <Popover modal open={open} onOpenChange={(v) => { setOpen(v); if (!v) setBusca(""); }}>
      <PopoverTrigger asChild>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" title="Mencionar pessoa ou departamento" aria-label="Mencionar pessoa ou departamento" onMouseDown={(e) => e.preventDefault()}><AtSign /></Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-2" align="start" onOpenAutoFocus={(e) => { if (consulta != null) e.preventDefault(); }}>
        <Input
          autoFocus={consulta == null}
          value={termo}
          onChange={(e) => { if (consulta == null) setBusca(e.target.value); }}
          readOnly={consulta != null}
          placeholder="Buscar pessoa ou departamento"
          aria-label="Buscar menção"
        />
        <ul className="mt-2 max-h-64 overflow-y-auto overscroll-contain">
          {itens.length === 0 && <li className="px-2 py-3 text-sm text-muted-foreground">Nada encontrado.</li>}
          {itens.map((m) => (
            <li key={m.tipo + m.id}>
              <button type="button" className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-muted" onMouseDown={(e) => e.preventDefault()} onClick={() => { onSelect(m); setOpen(false); setBusca(""); }}>
                {m.tipo === "pessoa" ? <User className="size-4 text-accent" /> : <Building2 className="size-4 text-accent" />}
                <span className="truncate">{m.nome}</span>
                {m.tipo === "departamento" && <span className="ml-auto text-xs text-muted-foreground">Departamento</span>}
              </button>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

/** Plain text with mention chips (comments and mural posts). */
export function TextoComMencoes({ texto, className }: { texto: string; className?: string }) {
  return <p className={className}>{partesMencao(texto).map((p, i) => "texto" in p ? <span key={i}>{p.texto}</span> : <span key={i} className={`chip-mencao${p.departamento ? " is-depto" : ""}`}>@{p.nome}</span>)}</p>;
}

/** Inserts a mention token into a textarea value at the cursor, replacing a just-typed "@query". */
export function inserirMencaoEmTexto(valor: string, el: HTMLTextAreaElement | null, token: string) {
  const pos = el?.selectionStart ?? valor.length;
  const antes = valor.slice(0, pos);
  const depois = valor.slice(pos);
  const semConsulta = consultaMencaoAtiva(antes) !== null ? antes.replace(/@([^\s@]*)$/, "") : antes.replace(/@$/, "");
  return `${semConsulta}${semConsulta && !/\s$/.test(semConsulta) ? " " : ""}${token} ${depois}`;
}
