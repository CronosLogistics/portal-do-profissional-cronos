import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { buscarGifs } from "@/lib/giphy";

/** Botão "GIF" que abre busca do Giphy (Em alta quando vazio). */
export function GifPicker({ onSelect, className }: { onSelect: (url: string) => void; className?: string }) {
  const [open, setOpen] = useState(false);
  const [termo, setTermo] = useState("");
  const [busca, setBusca] = useState("");
  useEffect(() => { const t = setTimeout(() => setBusca(termo), 400); return () => clearTimeout(t); }, [termo]);
  const gifs = useQuery({ queryKey: ["giphy", busca], queryFn: () => buscarGifs(busca), enabled: open, staleTime: 5 * 60_000 });
  return (
    {/* modal: inside Dialog (AvisoForm), remove-scroll blocks wheel on portaled content otherwise */}
    <Popover modal open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="sm" className={`h-8 px-2 text-xs font-bold ${className ?? ""}`} aria-label="Inserir GIF" title="Inserir GIF" onMouseDown={(e) => e.preventDefault()}>GIF</Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-2" align="start">
        <Input autoFocus value={termo} onChange={(e) => setTermo(e.target.value)} placeholder="Buscar GIFs" aria-label="Buscar GIFs" />
        <p className="mt-2 text-xs font-semibold text-muted-foreground">{busca.trim() ? "Resultados" : "Em alta"}</p>
        <div className="mt-1 grid max-h-72 grid-cols-3 gap-1 overflow-y-auto overscroll-contain">
          {gifs.isLoading && <p className="col-span-3 py-6 text-center text-xs text-muted-foreground">Carregando…</p>}
          {gifs.error && <p className="col-span-3 py-6 text-center text-xs text-destructive">{(gifs.error as Error).message}</p>}
          {gifs.data?.length === 0 && <p className="col-span-3 py-6 text-center text-xs text-muted-foreground">Nenhum GIF encontrado.</p>}
          {gifs.data?.map((g) => (
            <button key={g.id} type="button" className="overflow-hidden rounded bg-muted focus-visible:ring-2 focus-visible:ring-ring" title={g.titulo} onClick={() => { onSelect(g.url); setOpen(false); setTermo(""); }}>
              <img src={g.preview} alt={g.titulo} loading="lazy" className="h-20 w-full object-cover" />
            </button>
          ))}
        </div>
        <p className="mt-2 text-right text-[10px] text-muted-foreground">Powered by GIPHY</p>
      </PopoverContent>
    </Popover>
  );
}
