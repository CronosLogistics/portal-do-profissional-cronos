import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buscarMencionaveis } from "@/lib/mencoes";

export function BuscaColegas() {
  const [aberta, setAberta] = useState(false);
  const [termo, setTermo] = useState("");
  const [busca, setBusca] = useState("");
  const [ativo, setAtivo] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => { const t = setTimeout(() => setBusca(termo.trim()), 250); return () => clearTimeout(t); }, [termo]);
  useEffect(() => { if (aberta) input.current?.focus(); }, [aberta]);
  useEffect(() => {
    if (!aberta) return;
    const fora = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) fechar(); };
    document.addEventListener("mousedown", fora);
    return () => document.removeEventListener("mousedown", fora);
  }, [aberta]);

  const { data = [], isFetching } = useQuery({
    queryKey: ["busca-colegas", busca],
    queryFn: async () => (await buscarMencionaveis(busca)).filter(m => m.tipo === "pessoa").slice(0, 8),
    enabled: aberta && busca.length >= 2,
    staleTime: 60_000,
  });

  function fechar() { setAberta(false); setTermo(""); setBusca(""); setAtivo(0); }
  function ir(id: string) { fechar(); void navigate({ to: "/perfil/$id", params: { id } }); }

  if (!aberta) return <Button variant="ghost" size="icon" onClick={() => setAberta(true)} aria-label="Pesquisar colega" title="Pesquisar colega"><Search /></Button>;

  return (
    <div ref={ref} className="relative">
      <div className="flex h-9 w-56 items-center gap-2 rounded-md border border-input bg-background px-2 sm:w-72">
        <Search className="size-4 shrink-0 text-muted-foreground" />
        <input ref={input} value={termo} onChange={e => { setTermo(e.target.value); setAtivo(0); }} placeholder="Pesquisar colega..." aria-label="Pesquisar colega"
          className="min-w-0 flex-1 bg-transparent text-sm outline-none"
          onKeyDown={e => {
            if (e.key === "Escape") fechar();
            else if (e.key === "ArrowDown") { e.preventDefault(); setAtivo(a => Math.min(a + 1, data.length - 1)); }
            else if (e.key === "ArrowUp") { e.preventDefault(); setAtivo(a => Math.max(a - 1, 0)); }
            else if (e.key === "Enter" && data[ativo]) ir(data[ativo].id);
          }} />
        <button type="button" onClick={fechar} aria-label="Fechar pesquisa" className="text-muted-foreground"><X className="size-4" /></button>
      </div>
      {busca.length >= 2 && (
        <ul className="absolute right-0 top-11 z-50 w-full overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-md">
          {data.length === 0 ? <li className="px-3 py-2 text-sm text-muted-foreground">{isFetching ? "Buscando..." : "Nenhum colega encontrado"}</li>
            : data.map((p, i) => (
              <li key={p.id}><button type="button" onMouseEnter={() => setAtivo(i)} onClick={() => ir(p.id)}
                className={`w-full px-3 py-2 text-left text-sm ${i === ativo ? "bg-accent text-accent-foreground" : ""}`}>{p.nome.replace(/\s*-\s*Cronos Logistics$/i, "")}</button></li>
            ))}
        </ul>
      )}
    </div>
  );
}
