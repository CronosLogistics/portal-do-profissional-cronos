import { useEffect, useRef, useState } from "react";

type Destino = { id: string; compartilhado: boolean };
type Ligacao = Destino & { caminho: string };

/** Setas medidas dentro do canvas: acompanham tamanho dos cartões sem depender do zoom ou da posição da câmera. */
export function OrganogramaConexoes({ destinos }: { destinos: Destino[] }) {
  const svg = useRef<SVGSVGElement>(null);
  const [ligacoes, setLigacoes] = useState<Ligacao[]>([]);
  const assinatura = JSON.stringify(destinos);

  useEffect(() => {
    const container = svg.current?.parentElement;
    if (!container) return;
    const alvos: Destino[] = JSON.parse(assinatura);
    const medir = () => {
      // Os ramos são recriados ao mover/editar o canvas; nunca medir referências de cartões desmontados.
      const nos = new Map(Array.from(container.querySelectorAll<HTMLElement>("[data-org-node]")).map((el) => [el.dataset["orgNode"], el]));
      const raiz = nos.get("Diretoria");
      if (!raiz) return;
      const c = container.getBoundingClientRect();
      const escala = c.width / container.offsetWidth;
      if (!escala) return;
      const r = raiz.getBoundingClientRect();
      const x = (r.left + r.width / 2 - c.left) / escala;
      const y = (r.bottom - c.top) / escala;
      const proximas: Ligacao[] = [];
      for (const alvo of alvos) {
        const el = nos.get(alvo.id);
        if (!el) continue;
        const t = el.getBoundingClientRect();
        const tx = (t.left + t.width / 2 - c.left) / escala;
        const ty = (t.top - c.top) / escala;
        const dobra = y + (alvo.compartilhado ? 24 : 48);
        proximas.push({ ...alvo, caminho: `M ${x} ${y} V ${dobra} H ${tx} V ${ty}` });
      }
      setLigacoes((atuais) => JSON.stringify(atuais) === JSON.stringify(proximas) ? atuais : proximas);
    };

    const observer = new ResizeObserver(medir);
    observer.observe(container);
    let frame = 0;
    const mutations = new MutationObserver((records) => {
      if (!records.some((r) => r.target instanceof HTMLElement && !svg.current?.contains(r.target))) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(medir);
    });
    mutations.observe(container, { childList: true, subtree: true });
    medir();
    return () => { observer.disconnect(); mutations.disconnect(); cancelAnimationFrame(frame); };
  }, [assinatura]);

  return (
    <svg ref={svg} className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">
      <defs>
        <marker id="org-seta-compartilhada" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse" markerUnits="userSpaceOnUse">
          <path d="M 1 1 L 9 5 L 1 9" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary" />
        </marker>
        <marker id="org-seta-individual" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse" markerUnits="userSpaceOnUse">
          <path d="M 1 1 L 9 5 L 1 9" fill="none" stroke="currentColor" strokeWidth="2" className="text-foreground" />
        </marker>
      </defs>
      {ligacoes.map((l) => (
        <path
          key={l.id}
          data-org-origem="Diretoria"
          data-org-destino={l.id}
          data-org-reporte={l.compartilhado ? "compartilhado" : "individual"}
          d={l.caminho}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={l.compartilhado ? "text-primary" : "text-foreground"}
          markerEnd={l.compartilhado ? "url(#org-seta-compartilhada)" : "url(#org-seta-individual)"}
        />
      ))}
    </svg>
  );
}