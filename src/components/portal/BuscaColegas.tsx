import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search, X } from "lucide-react";
import { buscarMencionaveis } from "@/lib/mencoes";
import { subtitulosColegas } from "@/lib/perfil.functions";
import { useFotoProfissional } from "@/hooks/use-minha-foto";
import { cn } from "@/lib/utils";

const semSufixo = (n: string) => n.replace(/\s*-\s*Cronos Logistics$/i, "").trim();
const iniciais = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "?";

function Avatar({ id, nome }: { id: string; nome: string }) {
  const foto = useFotoProfissional(id);
  return <span className="grid size-8 shrink-0 place-items-center overflow-hidden rounded-full bg-primary/10 text-xs font-bold text-primary">{foto ? <img src={foto} alt="" className="size-full object-cover" /> : iniciais(nome)}</span>;
}

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

  const ids = data.map((p) => p.id);
  const { data: subs = {} } = useQuery({
    queryKey: ["busca-colegas-sub", ids],
    queryFn: () => subtitulosColegas({ data: { ids } }),
    enabled: ids.length > 0,
    staleTime: 15 * 60_000,
  });

  function fechar() { setAberta(false); setTermo(""); setBusca(""); setAtivo(0); }
  function ir(id: string) { fechar(); void navigate({ to: "/perfil/$id", params: { id } }); }

  return (
    <div ref={ref} className="relative flex justify-end">
      <div
        className={cn(
          "flex h-9 items-center overflow-hidden rounded-md transition-[width,padding,gap,border-color,background-color,box-shadow] duration-300 ease-out",
          aberta
            ? "w-56 gap-2 border border-input bg-background px-2 sm:w-72"
            : "w-9 border border-transparent bg-transparent",
        )}
      >
        <button
          type="button"
          onClick={() => { if (!aberta) setAberta(true); }}
          aria-label="Pesquisar colega"
          title="Pesquisar colega"
          aria-expanded={aberta}
          className={cn(
            "grid shrink-0 place-items-center outline-none transition-colors",
            aberta ? "size-4 cursor-default text-muted-foreground" : "size-9 rounded-md hover:bg-accent hover:text-accent-foreground",
          )}
        >
          <Search className="size-4" />
        </button>
        <input
          ref={input}
          value={termo}
          onChange={e => { setTermo(e.target.value); setAtivo(0); }}
          placeholder="Pesquisar colega..."
          aria-label="Pesquisar colega"
          tabIndex={aberta ? 0 : -1}
          aria-hidden={!aberta}
          className={cn(
            "min-w-0 bg-transparent text-sm outline-none transition-[opacity,flex-grow] duration-200 ease-out",
            aberta ? "flex-1 opacity-100 delay-75" : "w-0 flex-none opacity-0 pointer-events-none",
          )}
          onKeyDown={e => {
            if (e.key === "Escape") fechar();
            else if (e.key === "ArrowDown") { e.preventDefault(); setAtivo(a => Math.min(a + 1, data.length - 1)); }
            else if (e.key === "ArrowUp") { e.preventDefault(); setAtivo(a => Math.max(a - 1, 0)); }
            else if (e.key === "Enter" && data[ativo]) ir(data[ativo].id);
          }}
        />
        <button
          type="button"
          onClick={fechar}
          aria-label="Fechar pesquisa"
          tabIndex={aberta ? 0 : -1}
          aria-hidden={!aberta}
          className={cn(
            "shrink-0 text-muted-foreground transition-opacity duration-200 ease-out",
            aberta ? "opacity-100 delay-75" : "w-0 overflow-hidden opacity-0 pointer-events-none",
          )}
        >
          <X className="size-4" />
        </button>
      </div>
      {aberta && busca.length >= 2 && (
        <ul className="absolute right-0 top-11 z-50 w-80 max-w-[90vw] overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-md">
          {data.length === 0 ? <li className="px-3 py-2 text-sm text-muted-foreground">{isFetching ? "Buscando..." : "Nenhum colega encontrado"}</li>
            : data.map((p, i) => (
              <li key={p.id}><button type="button" onMouseEnter={() => setAtivo(i)} onClick={() => ir(p.id)}
                className={`flex w-full items-center gap-3 px-3 py-2 text-left ${i === ativo ? "bg-muted" : ""}`}>
                <Avatar id={p.id} nome={semSufixo(p.nome)} />
                <span className="min-w-0"><span className="block truncate text-sm font-semibold text-foreground">{semSufixo(p.nome)}</span>
                  {subs[p.id] && <span className="block truncate text-xs text-muted-foreground">{subs[p.id]}</span>}</span>
              </button></li>
            ))}
        </ul>
      )}
    </div>
  );
}
