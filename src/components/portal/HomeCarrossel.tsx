import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Award, CakeSlice, CalendarCheck, ChevronLeft, ChevronRight, Heart, MapPin, Medal, Newspaper } from "lucide-react";
import { Link, useNavigate } from "@tanstack/react-router";
import { muralKey, muralVigentes, urlImagem, type PostVigente } from "@/lib/mural-client";
import { AvisoLeitura, type AvisoExibido } from "@/components/avisos/AvisoLeitura";
import { avisosKey, compiladoVigente, insiderVigente } from "@/lib/avisos-client";
import { CRONOS_DAY_FIM, formatarDataBrasilia } from "@/lib/avisos-rules";

type Slide = { id: string; conteudo: ReactNode };
const DURACAO = 7000;
const CRONOS_DAY_INICIO = new Date("2026-12-12T00:00:00-03:00");

/**
 * Carrossel da Início. Ordem fixa: 1 Cronos Day, 2 Aniversariantes, 3 Tempo de casa,
 * 4 outras comemorações do mural, 5 Cronos Insider, 6 Compilado de elogios.
 * Posição sem conteúdo vigente não aparece; sem nenhum slide, o carrossel some.
 */
export function HomeCarrossel() {
  const [agora, setAgora] = useState<Date | null>(null);
  useEffect(() => {
    setAgora(new Date());
    const t = setInterval(() => setAgora(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const insider = useQuery({ queryKey: [...avisosKey, "insider-vigente"], queryFn: insiderVigente, staleTime: 60_000 });
  const compilado = useQuery({ queryKey: [...avisosKey, "compilado-vigente"], queryFn: compiladoVigente, staleTime: 60_000 });
  const mural = useQuery({ queryKey: [...muralKey, "vigentes"], queryFn: muralVigentes, staleTime: 60_000 });
  const [aberto, setAberto] = useState<AvisoExibido | null>(null);
  const [atual, setAtual] = useState(0);
  const [pausado, setPausado] = useState(false);

  const slides: Slide[] = [];
  if (agora && agora <= CRONOS_DAY_FIM) slides.push({ id: "cronos-day", conteudo: <SlideCronosDay agora={agora} /> });
  const posts = mural.data ?? [];
  for (const tipo of ["aniversario", "tempo_casa", "geral"] as const) {
    for (const p of posts.filter((x) => x.tipo === tipo)) slides.push({ id: `mural-${p.id}`, conteudo: <SlideMural post={p} /> });
  }
  const ed = insider.data;
  if (ed) {
    slides.push({
      id: "insider",
      conteudo: (
        <SlideTexto
          icone={<Newspaper />}
          tag={`Cronos Insider · ${formatarDataBrasilia(ed.publicar_em).slice(0, 10)}`}
          titulo={ed.titulo}
          texto="A edição mais recente do nosso informativo já está disponível."
          acao={<button type="button" className="hc-btn" onClick={() => setAberto({ ...ed, tipo: "insider" })}>Ler edição completa</button>}
          visual={<div className="hc-visual-icon"><Newspaper /></div>}
        />
      ),
    });
  }
  const comp = compilado.data;
  if (comp) {
    slides.push({
      id: "compilado",
      conteudo: (
        <SlideTexto
          icone={<Award />}
          tag={`Compilado de elogios · ${comp.mes_ano.split("-").reverse().join("/")}`}
          titulo={comp.titulo}
          texto="Confira todos os elogios recebidos pelos nossos profissionais no mês."
          acao={<button type="button" className="hc-btn" onClick={() => setAberto({ ...comp, tipo: "compilado" })}>Ver elogios do mês</button>}
          visual={<div className="hc-visual-icon"><Award /></div>}
        />
      ),
    });
  }

  const total = slides.length;
  const idx = total ? Math.min(atual, total - 1) : 0;
  const ir = useCallback((i: number) => setAtual(((i % total) + total) % total), [total]);
  useEffect(() => {
    if (total < 2 || pausado) return;
    const t = setTimeout(() => ir(idx + 1), DURACAO);
    return () => clearTimeout(t);
  }, [total, idx, pausado, ir]);

  if (!total) return null;
  return (
    <section
      className="hc"
      aria-roledescription="carrossel"
      aria-label="Destaques"
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
    >
      <div className="hc-trilho">
        {slides.map((s, i) => (
          <div key={s.id} className={`hc-slide${i === idx ? " is-active" : ""}`} aria-hidden={i !== idx}>{s.conteudo}</div>
        ))}
      </div>
      {total > 1 && (
        <>
          <button type="button" className="hc-seta hc-seta-esq" aria-label="Slide anterior" onClick={() => ir(idx - 1)}><ChevronLeft /></button>
          <button type="button" className="hc-seta hc-seta-dir" aria-label="Próximo slide" onClick={() => ir(idx + 1)}><ChevronRight /></button>
          <div className="hc-rodape">
            <div className="hc-pontos">
              {slides.map((s, i) => (
                <button key={s.id} type="button" aria-label={`Ir para slide ${i + 1} de ${total}`} aria-current={i === idx} className={i === idx ? "is-active" : ""} onClick={() => ir(i)} />
              ))}
            </div>
            <div className="hc-progresso"><div key={`${idx}-${pausado}`} className={`hc-progresso-barra${pausado ? " is-paused" : ""}`} style={{ animationDuration: `${DURACAO}ms` }} /></div>
          </div>
        </>
      )}
      <AvisoLeitura aviso={aberto} onClose={() => setAberto(null)} />
    </section>
  );
}

function SlideTexto({ icone, tag, titulo, texto, acao, visual }: { icone: ReactNode; tag: string; titulo: ReactNode; texto: ReactNode; acao?: ReactNode; visual: ReactNode }) {
  return (
    <div className="hc-conteudo">
      <div className="hc-texto">
        <span className="hc-tag">{icone}<span>{tag}</span></span>
        <h2 className="hc-titulo">{titulo}</h2>
        <p className="hc-sub">{texto}</p>
        {acao && <div className="hc-acoes">{acao}</div>}
      </div>
      <div className="hc-visual">{visual}</div>
    </div>
  );
}

function SlideCronosDay({ agora }: { agora: Date }) {
  const dist = Math.max(0, CRONOS_DAY_INICIO.getTime() - agora.getTime());
  const hoje = dist === 0;
  const partes = [
    { v: Math.floor(dist / 86_400_000), l: "Dias", destaque: true },
    { v: Math.floor((dist % 86_400_000) / 3_600_000), l: "Horas" },
    { v: Math.floor((dist % 3_600_000) / 60_000), l: "Min" },
    { v: Math.floor((dist % 60_000) / 1000), l: "Seg", destaque: true },
  ];
  return (
    <SlideTexto
      icone={<CalendarCheck />}
      tag="Cronos Day · 12/12/2026"
      titulo={hoje ? "É hoje o nosso grande dia!" : "Nosso grande dia está chegando!"}
      texto="Prepare-se para a celebração anual mais aguardada: conquistas, reconhecimento e integração de toda a equipe."
      acao={<span className="hc-chip"><MapPin /> Cronos Logistics · Cronos Day 2026</span>}
      visual={
        <div className="hc-timer">
          {partes.map((p) => (
            <div key={p.l} className={`hc-timer-bloco${p.destaque ? " is-destaque" : ""}`}>
              <span className="hc-timer-num">{String(p.v).padStart(2, "0")}</span>
              <span className="hc-timer-rot">{p.l}</span>
            </div>
          ))}
        </div>
      }
    />
  );
}

function SlideMural({ post }: { post: PostVigente }) {
  const navigate = useNavigate();
  const [img, setImg] = useState<string | null>(null);
  useEffect(() => { urlImagem(post.imagem_path).then(setImg); }, [post.imagem_path]);
  const data = post.data_post.split("-").reverse().join("/");
  const resumo = post.texto ? post.texto.slice(0, 160) + (post.texto.length > 160 ? "…" : "") : "";

  const parabenizar = async () => {
    const { default: confetti } = await import("canvas-confetti");
    const cor = (v: string) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
    confetti({ particleCount: 90, spread: 75, origin: { y: 0.45 }, colors: [cor("--sidebar"), cor("--primary"), cor("--accent"), "#FFD700"] });
    setTimeout(() => navigate({ to: "/mural", search: { post: post.id } }), 900);
  };

  const config = {
    aniversario: { icone: <CakeSlice />, tag: "Aniversariante do dia", sub: resumo || "Hoje o dia é especial! Desejamos muito sucesso, saúde e realizações.", botao: "Enviar parabéns", emblema: "👑" },
    tempo_casa: { icone: <Medal />, tag: post.anos_casa ? `${post.anos_casa} ${post.anos_casa === 1 ? "ano" : "anos"} de Cronos` : "Tempo de casa", sub: resumo || "Obrigado pela dedicação e por fazer parte da nossa história!", botao: "Parabenizar", emblema: post.anos_casa ? `${post.anos_casa}` : "★" },
    geral: { icone: <Heart />, tag: `Mural de comemorações · ${data}`, sub: resumo || "Clique para deixar sua mensagem.", botao: "Deixar mensagem", emblema: "🎉" },
  }[post.tipo];

  return (
    <SlideTexto
      icone={config.icone}
      tag={config.tag}
      titulo={post.titulo}
      texto={config.sub}
      acao={
        <>
          {post.tipo === "geral"
            ? <Link to="/mural" search={{ post: post.id }} className="hc-btn">{config.botao}</Link>
            : <button type="button" className="hc-btn" onClick={parabenizar}><Heart /> {config.botao}</button>}
          <span className="hc-data">{data} · Cronos Family</span>
        </>
      }
      visual={
        <div className="hc-moldura">
          <div className="hc-moldura-brilho" />
          <div className="hc-moldura-foto">
            {img ? <img src={img} alt={post.titulo} /> : <div className="hc-moldura-vazia">{config.icone}</div>}
          </div>
          <span className="hc-emblema">{config.emblema}</span>
        </div>
      }
    />
  );
}
