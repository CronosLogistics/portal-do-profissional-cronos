import { useEffect, useLayoutEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

type Passo = { alvo: string; titulo: string; texto: string };

const PASSOS: Passo[] = [
  { alvo: ".portal-nav", titulo: "Bem-vindo(a) ao Portal do Profissional!", texto: "Este é o menu principal. Por aqui você chega a todas as áreas do portal." },
  { alvo: '.portal-nav a[href="/"]', titulo: "Início", texto: "A página inicial reúne os destaques e atalhos do dia." },
  { alvo: "section.hc", titulo: "Destaques", texto: "No carrossel aparecem o Cronos Day, aniversariantes, o Cronos Insider e o compilado de elogios." },
  { alvo: ".portal-bell", titulo: "Avisos", texto: "O sino mostra os comunicados novos. O número indica quantos você ainda não leu." },
  { alvo: '.portal-nav a[href="/mural"]', titulo: "Mural de comemorações", texto: "Celebre aniversários e conquistas dos colegas, com comentários e reações." },
  { alvo: '.portal-nav a[href="/feedback"]', titulo: "Feedback", texto: "Veja os elogios em que você está envolvido(a)." },
  { alvo: '.portal-nav a[href="/formularios"]', titulo: "Formulários", texto: "Todos os formulários da Cronos em um só lugar." },
  { alvo: '.portal-nav a[href="/documentos"]', titulo: "Documentos", texto: "Links para os documentos oficiais mantidos pela Qualidade." },
];

const visivel = (sel: string) => {
  const el = document.querySelector(sel);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0 && r.right > 0 && r.left < window.innerWidth ? el : null;
};
const temModal = () => !!document.querySelector('[role="dialog"]');

/** Tour da primeira entrada. O "já viu" fica no cadastro da pessoa (vale em qualquer computador). */
export function TourBoasVindas({ userId }: { userId: string | undefined }) {
  const [passos, setPassos] = useState<Passo[] | null>(null);
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!userId) return;
    let vivo = true;
    let timer: ReturnType<typeof setInterval> | undefined;
    void supabase.rpc("tour_pendente").then(({ data }) => {
      if (!vivo || data !== true) return;
      // Espera a tela montar e nenhum modal (ex.: leitor ou escolha de escritório) estar aberto.
      timer = setInterval(() => {
        if (temModal() || !document.querySelector(".portal-nav")) return;
        clearInterval(timer);
        setPassos(PASSOS.filter((p) => visivel(p.alvo)));
      }, 800);
    });
    return () => { vivo = false; if (timer) clearInterval(timer); };
  }, [userId]);

  const passo = passos?.[i];
  useLayoutEffect(() => {
    if (!passo) return;
    const medir = () => {
      const el = document.querySelector(passo.alvo);
      el?.scrollIntoView({ block: "nearest" });
      setRect(el?.getBoundingClientRect() ?? null);
    };
    medir();
    window.addEventListener("resize", medir);
    return () => window.removeEventListener("resize", medir);
  }, [passo]);

  if (!passos || !passo) return null;
  const encerrar = () => { setPassos(null); void supabase.rpc("marcar_tour_visto").then(({ error }) => { if (error) console.error(error); }); };
  const ultimo = i === passos.length - 1;

  const pad = 6;
  const caixaW = 320;
  let top = rect ? rect.bottom + 12 : window.innerHeight / 2 - 80;
  let left = rect ? rect.right + 12 : window.innerWidth / 2 - caixaW / 2;
  if (rect && left + caixaW > window.innerWidth - 12) left = Math.max(12, Math.min(rect.left, window.innerWidth - caixaW - 12));
  else if (rect) top = rect.top;
  if (top + 200 > window.innerHeight) top = Math.max(12, (rect?.top ?? 0) - 200);

  return (
    <div className="tour-raiz" aria-live="polite">
      {rect && (
        <div className="tour-foco" style={{ top: rect.top - pad, left: rect.left - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 }} />
      )}
      <div role="alertdialog" aria-label={passo.titulo} className="tour-caixa" style={{ top, left, width: caixaW }}>
        <p className="text-xs font-semibold text-primary">{i + 1} de {passos.length}</p>
        <h2 className="mt-1 text-base font-bold text-foreground">{passo.titulo}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{passo.texto}</p>
        <div className="mt-4 flex items-center justify-between gap-2">
          <Button variant="ghost" size="sm" onClick={encerrar}>Pular</Button>
          <Button size="sm" onClick={() => (ultimo ? encerrar() : setI(i + 1))}>{ultimo ? "Concluir" : "Próximo"}</Button>
        </div>
      </div>
    </div>
  );
}
