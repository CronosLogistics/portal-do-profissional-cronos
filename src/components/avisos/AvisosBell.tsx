import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { avisosKey, listarAvisos, marcarTodosLidos } from "@/lib/avisos-client";
import { formatarDataBrasilia } from "@/lib/avisos-rules";

export function AvisosBell({ naoLidos }: { naoLidos: number }) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const recentes = useQuery({ queryKey: [...avisosKey, "recentes"], queryFn: () => listarAvisos(false, 5, 0), enabled: open });
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="portal-bell" aria-label={naoLidos ? `Avisos: ${naoLidos} não lidos` : "Avisos"}>
          <Bell />
          {naoLidos > 0 && <span className="portal-count-badge portal-bell-badge">{naoLidos > 99 ? "99+" : naoLidos}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[340px] p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <strong className="text-sm">Avisos</strong>
          <Button
            variant="link"
            size="sm"
            className="h-auto p-0 text-xs"
            disabled={!naoLidos}
            onClick={async () => {
              await marcarTodosLidos();
              await qc.invalidateQueries({ queryKey: avisosKey });
            }}
          >
            Marcar todas
          </Button>
        </div>
        <ul className="max-h-[360px] overflow-y-auto">
          {recentes.isLoading && <li className="px-4 py-6 text-center text-sm text-muted-foreground">Carregando...</li>}
          {recentes.data?.length === 0 && <li className="px-4 py-6 text-center text-sm text-muted-foreground">Nenhum aviso por aqui.</li>}
          {recentes.data?.map((a) => (
            <li key={a.id}>
              <button
                type="button"
                className={`aviso-bell-item ${a.lido ? "" : "is-unread"}`}
                onClick={() => {
                  setOpen(false);
                  void navigate({ to: "/avisos", search: { aviso: a.id } });
                }}
              >
                <span className="text-[11px] font-bold uppercase text-accent">{a.perfil_nome}</span>
                <span className="line-clamp-2 text-sm">{a.titulo}</span>
                <span className="text-xs text-muted-foreground">{formatarDataBrasilia(a.publicar_em)}</span>
              </button>
            </li>
          ))}
        </ul>
        <div className="border-t p-2 text-center">
          <Button asChild variant="ghost" size="sm" className="w-full">
            <Link to="/avisos" onClick={() => setOpen(false)}>Ver todos os avisos</Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
