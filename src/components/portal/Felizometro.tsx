import { useEffect, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Arrow } from "@radix-ui/react-popover";
import { Check, LoaderCircle, ShieldCheck, Smile, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { consultarPulso, enviarPulso } from "@/lib/felizometro-client";
import { SENTIMENTOS } from "@/lib/felizometro.rules";

export function Felizometro({ children, userId, inicio }: { children: ReactNode; userId: string | undefined; inicio: boolean }) {
  const client = useQueryClient();
  const [aberto, setAberto] = useState(false);
  const [dispensado, setDispensado] = useState("");
  const [sentimento, setSentimento] = useState<number | null>(null);
  const [relato, setRelato] = useState("");
  const [agradecer, setAgradecer] = useState(false);
  const pulso = useQuery({ queryKey: ["felizometro-pendente", userId], queryFn: consultarPulso, enabled: !!userId && inicio, refetchInterval: inicio ? 60_000 : false });
  const dia = pulso.data?.dia ?? "";
  const enviar = useMutation({
    mutationFn: () => {
      if (sentimento === null) throw new Error("Selecione um sentimento.");
      return enviarPulso(sentimento, relato);
    },
    onSuccess: () => {
      setAgradecer(true);
      setRelato("");
      void client.invalidateQueries({ queryKey: ["felizometro-pendente", userId] });
    },
  });
  useEffect(() => {
    if (inicio && pulso.data?.pendente && dispensado !== dia) setAberto(true);
    if (!inicio) setAberto(false);
  }, [inicio, pulso.data?.pendente, dispensado, dia]);
  useEffect(() => { setSentimento(null); setRelato(""); setAgradecer(false); }, [dia, userId]);

  function fechar() {
    if (enviar.isPending) return;
    setDispensado(dia);
    setAberto(false);
    enviar.reset();
  }
  const sexta = pulso.data?.pulso === "sexta";
  return <Popover open={aberto && inicio} onOpenChange={next => { if (!next) fechar(); else setAberto(true); }}>
    <PopoverAnchor asChild>
      <div className="flex min-w-0 items-center gap-3">
        {inicio && pulso.data?.pendente && <Button variant="ghost" size="icon" title="Pulso semanal" aria-label="Abrir pulso semanal" onClick={() => setAberto(true)}><Smile className="size-5 text-primary" /></Button>}
        {children}
      </div>
    </PopoverAnchor>
    <PopoverContent align="end" sideOffset={16} collisionPadding={12} className="w-[390px] max-w-[calc(100vw-24px)] p-5 motion-reduce:animate-none" aria-label="Felizômetro — Pulso semanal" onOpenAutoFocus={event => event.preventDefault()} onInteractOutside={event => {
      const alvo = event.target;
      if (enviar.isPending || (alvo instanceof Element && alvo.closest('[aria-label="Abrir pulso semanal"]'))) event.preventDefault();
    }}>
      <Arrow className="fill-popover" width={18} height={9} />
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="text-xs font-bold text-secondary">Pulso de {sexta ? "Sexta-feira" : "Segunda-feira"}</span>
        <Button variant="ghost" size="icon" className="size-7" disabled={enviar.isPending} onClick={fechar} aria-label="Fechar pulso semanal"><X className="size-4" /></Button>
      </div>
      {agradecer ? <div role="status" className="py-5 text-center"><Check className="mx-auto mb-3 size-8 text-success" /><p className="font-bold">Obrigado por compartilhar!</p><p className="mt-1 text-sm text-muted-foreground">{sexta ? "Bom descanso!" : "Boa semana!"}</p><Button variant="ghost" className="mt-4" onClick={fechar}>Fechar</Button></div> : <form onSubmit={event => { event.preventDefault(); enviar.mutate(); }}>
        <h2 className="text-base font-bold leading-snug">{sexta ? "Como foi a sua semana por aqui?" : "Como você está começando a semana?"}</h2>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">Leva 1 segundo e nos ajuda a melhorar como time!</p>
        <p className="mt-1 flex items-center gap-1.5 text-xs font-bold text-secondary"><ShieldCheck className="size-3.5" />A pesquisa é anônima.</p>
        <div className="my-4 grid grid-cols-5 gap-1.5" role="group" aria-label="Como está se sentindo">
          {SENTIMENTOS.map(item => <Button key={item.valor} type="button" variant="outline" disabled={enviar.isPending} aria-pressed={sentimento === item.valor} aria-label={item.nome} onClick={() => { setSentimento(item.valor); enviar.reset(); }} className={`h-[82px] min-w-0 flex-col gap-2 whitespace-normal px-1 ${sentimento === item.valor ? "border-primary bg-primary/5 text-primary" : "bg-muted/40"}`}>
            <span className="text-2xl" aria-hidden="true">{item.emoji}</span><span className="text-[10px] leading-tight">{item.nome}</span>
          </Button>)}
        </div>
        <div className="border-t pt-3">
          <label htmlFor="felizometro-relato" className="text-xs">Quer contar o motivo em uma frase? <span className="text-muted-foreground">(opcional)</span></label>
          <Textarea id="felizometro-relato" value={relato} onChange={event => setRelato(event.target.value)} maxLength={1000} disabled={enviar.isPending} placeholder="Ex.: demanda acumulada, uma conquista do time…" className="mt-2 min-h-16 resize-none text-sm" />
          <p className="mt-1 text-[11px] text-muted-foreground">Para preservar seu anonimato, evite nomes e detalhes que identifiquem você.</p>
        </div>
        {enviar.isError && <p role="alert" className="mt-3 text-xs text-destructive">{enviar.error.message}</p>}
        <div className="mt-4 flex justify-end gap-2"><Button type="button" variant="ghost" size="sm" disabled={enviar.isPending} onClick={fechar}>Pular</Button><Button type="submit" size="sm" disabled={sentimento === null || enviar.isPending}>{enviar.isPending && <LoaderCircle className="size-4 animate-spin" />}Enviar retorno</Button></div>
      </form>}
    </PopoverContent>
  </Popover>;
}