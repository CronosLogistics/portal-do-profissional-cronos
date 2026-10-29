import { useEffect, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarHeart, ChevronLeft, ChevronRight, Newspaper } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AvisoLeitura, type AvisoExibido } from "@/components/avisos/AvisoLeitura";
import { avisosKey, insiderVigente } from "@/lib/avisos-client";
import { diasParaCronosDay, formatarDataBrasilia } from "@/lib/avisos-rules";

type Slide = { id: string; conteudo: ReactNode };

/**
 * Carrossel da Início com 4 posições fixas: 1 Cronos Day, 2 Mural, 3 Cronos Insider, 4 Compilado de elogios.
 * Posição sem conteúdo vigente não aparece; sem nenhum slide, o carrossel some.
 */
export function HomeCarrossel() {
  const [agora, setAgora] = useState<Date | null>(null);
  useEffect(() => {
    setAgora(new Date());
    const t = setInterval(() => setAgora(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);
  const insider = useQuery({ queryKey: [...avisosKey, "insider-vigente"], queryFn: insiderVigente, staleTime: 60_000 });
  const [aberto, setAberto] = useState<AvisoExibido | null>(null);
  const [atual, setAtual] = useState(0);

  const slides: Slide[] = [];
  const dias = agora ? diasParaCronosDay(agora) : null;
  if (dias !== null) {
    slides.push({
      id: "cronos-day",
      conteudo: (
        <div className="home-slide home-slide-day">
          <CalendarHeart className="home-slide-icon" />
          <div>
            <p className="home-slide-tag">Cronos Day · 12/12/2026</p>
            <p className="home-slide-big">{dias === 0 ? "É hoje!" : <>Faltam <strong>{dias}</strong> {dias === 1 ? "dia" : "dias"}</>}</p>
            <p className="home-slide-sub">para o nosso grande dia.</p>
          </div>
        </div>
      ),
    });
  }
  const ed = insider.data;
  if (ed) {
    slides.push({
      id: "insider",
      conteudo: (
        <button type="button" className="home-slide home-slide-insider" onClick={() => setAberto({ ...ed, tipo: "insider" })}>
          <Newspaper className="home-slide-icon" />
          <div>
            <p className="home-slide-tag">Cronos Insider · {formatarDataBrasilia(ed.publicar_em).slice(0, 10)}</p>
            <p className="home-slide-big">{ed.titulo}</p>
            <p className="home-slide-sub">Clique para ler a edição completa.</p>
          </div>
        </button>
      ),
    });
  }

  const total = slides.length;
  const idx = total ? Math.min(atual, total - 1) : 0;
  useEffect(() => {
    if (total < 2) return;
    const t = setInterval(() => setAtual((i) => (i + 1) % total), 8000);
    return () => clearInterval(t);
  }, [total, atual]);

  if (!total) return null;
  return (
    <section className="home-carrossel" aria-roledescription="carrossel" aria-label="Destaques">
      <div className="home-carrossel-trilho">{slides[idx]?.conteudo}</div>
      {total > 1 && (
        <div className="home-carrossel-controles">
          <Button size="icon" variant="ghost" aria-label="Anterior" onClick={() => setAtual((idx - 1 + total) % total)}><ChevronLeft /></Button>
          <div className="home-carrossel-pontos">
            {slides.map((s, i) => (
              <button key={s.id} type="button" aria-label={`Slide ${i + 1} de ${total}`} aria-current={i === idx} className={i === idx ? "is-active" : ""} onClick={() => setAtual(i)} />
            ))}
          </div>
          <Button size="icon" variant="ghost" aria-label="Próximo" onClick={() => setAtual((idx + 1) % total)}><ChevronRight /></Button>
        </div>
      )}
      <AvisoLeitura aviso={aberto} onClose={() => setAberto(null)} />
    </section>
  );
}
