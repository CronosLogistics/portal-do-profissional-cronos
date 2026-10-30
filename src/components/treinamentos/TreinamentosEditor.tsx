import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Loader2, Plus, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CONTEUDO_PADRAO, ICONES_ETAPA, enviarImagemTreino, salvarTreinamentos,
  type ConteudoTreinamentos, type EtapaTreino, type IconeEtapa,
} from "@/lib/treinamentos-client";

const NOMES_ICONE: Record<IconeEtapa, string> = {
  cadastro: "Prancheta", agenda: "Calendário", email: "E-mail", pessoas: "Pessoas", assinatura: "Assinatura", trofeu: "Troféu",
};

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  conteudo: ConteudoTreinamentos;
  imagens: Record<string, string>;
  onSalvo: () => void;
};

export function TreinamentosEditor({ open, onOpenChange, conteudo, imagens, onSalvo }: Props) {
  const [c, setC] = useState(conteudo);
  const [salvando, setSalvando] = useState(false);
  const [enviando, setEnviando] = useState<number | null>(null);
  const [previas, setPrevias] = useState<Record<string, string>>({});

  useEffect(() => { if (open) { setC(conteudo); setPrevias({}); } }, [open, conteudo]);

  const setEtapa = (i: number, patch: Partial<EtapaTreino>) =>
    setC((p) => ({ ...p, etapas: p.etapas.map((e, j) => (j === i ? { ...e, ...patch } : e)) }));

  const mover = (i: number, d: -1 | 1) =>
    setC((p) => {
      const arr = [...p.etapas];
      const j = i + d;
      if (j < 0 || j >= arr.length) return p;
      [arr[i], arr[j]] = [arr[j]!, arr[i]!];
      return { ...p, etapas: arr };
    });

  async function trocarImagem(i: number, file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Escolha um arquivo de imagem."); return; }
    setEnviando(i);
    try {
      const ref = await enviarImagemTreino(file);
      setPrevias((p) => ({ ...p, [ref]: URL.createObjectURL(file) }));
      setEtapa(i, { image: ref });
    } catch {
      toast.error("Não foi possível enviar a imagem.");
    } finally {
      setEnviando(null);
    }
  }

  async function salvar() {
    setSalvando(true);
    try {
      await salvarTreinamentos({
        ...c,
        pontuacao: c.pontuacao.filter((p) => p.categoria.trim()),
        etapas: c.etapas.map((e) => ({ ...e, bullets: e.bullets.map((b) => b.trim()).filter(Boolean) })),
      });
      toast.success("Informações salvas.");
      onSalvo();
      onOpenChange(false);
    } catch {
      toast.error("Não foi possível salvar.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader><DialogTitle>Editar Treinamentos</DialogTitle></DialogHeader>
        <Tabs defaultValue="etapas">
          <TabsList className="flex-wrap">
            <TabsTrigger value="etapas">Passo a passo</TabsTrigger>
            <TabsTrigger value="pontuacao">Pontuação</TabsTrigger>
            <TabsTrigger value="certificados">Certificados</TabsTrigger>
            <TabsTrigger value="links">Links</TabsTrigger>
          </TabsList>

          <TabsContent value="etapas" className="space-y-4">
            {c.etapas.map((e, i) => {
              const src = previas[e.image] ?? imagens[e.image];
              return (
                <div key={i} className="space-y-3 rounded-lg border border-border p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold">Etapa {e.num || i + 1}</p>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" aria-label="Subir etapa" onClick={() => mover(i, -1)}><ArrowUp className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" aria-label="Descer etapa" onClick={() => mover(i, 1)}><ArrowDown className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" aria-label="Remover etapa"
                        onClick={() => setC((p) => ({ ...p, etapas: p.etapas.filter((_, j) => j !== i) }))}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-[100px_1fr_160px]">
                    <div><Label>Número</Label><Input value={e.num} onChange={(ev) => setEtapa(i, { num: ev.target.value })} /></div>
                    <div><Label>Título</Label><Input value={e.title} onChange={(ev) => setEtapa(i, { title: ev.target.value })} /></div>
                    <div>
                      <Label>Ícone</Label>
                      <select className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={e.icone}
                        onChange={(ev) => setEtapa(i, { icone: ev.target.value as IconeEtapa })}>
                        {ICONES_ETAPA.map((k) => <option key={k} value={k}>{NOMES_ICONE[k]}</option>)}
                      </select>
                    </div>
                  </div>
                  <div><Label>Descrição</Label><Textarea rows={3} value={e.description} onChange={(ev) => setEtapa(i, { description: ev.target.value })} /></div>
                  <div><Label>Tópicos (um por linha)</Label>
                    <Textarea rows={2} value={e.bullets.join("\n")} onChange={(ev) => setEtapa(i, { bullets: ev.target.value.split("\n") })} /></div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div><Label>Texto do botão</Label><Input value={e.ctaLabel} onChange={(ev) => setEtapa(i, { ctaLabel: ev.target.value })} /></div>
                    <div><Label>Link do botão</Label><Input value={e.ctaHref} placeholder="https://" onChange={(ev) => setEtapa(i, { ctaHref: ev.target.value })} /></div>
                    <div><Label>Etiqueta (opcional)</Label><Input value={e.badge} onChange={(ev) => setEtapa(i, { badge: ev.target.value })} /></div>
                    <div><Label>Descrição da imagem</Label><Input value={e.imageAlt} onChange={(ev) => setEtapa(i, { imageAlt: ev.target.value })} /></div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    {src ? <img src={src} alt="" className="h-20 w-auto rounded border border-border" /> : <span className="text-sm text-muted-foreground">Sem imagem</span>}
                    <Button asChild size="sm" variant="outline">
                      <label className="cursor-pointer">
                        {enviando === i ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                        {e.image ? "Trocar imagem" : "Enviar imagem"}
                        <input type="file" accept="image/*" className="hidden" onChange={(ev) => { void trocarImagem(i, ev.target.files?.[0]); ev.target.value = ""; }} />
                      </label>
                    </Button>
                    {e.image ? <Button size="sm" variant="ghost" onClick={() => setEtapa(i, { image: "" })}>Remover imagem</Button> : null}
                  </div>
                </div>
              );
            })}
            <Button variant="outline" onClick={() => setC((p) => ({
              ...p,
              etapas: [...p.etapas, { ...CONTEUDO_PADRAO.etapas[0]!, num: String(p.etapas.length + 1).padStart(2, "0"), title: "Nova etapa", description: "", bullets: [], ctaLabel: "", ctaHref: "", image: "", imageAlt: "", badge: "" }],
            }))}><Plus className="h-4 w-4" /> Adicionar etapa</Button>
          </TabsContent>

          <TabsContent value="pontuacao" className="space-y-3">
            {c.pontuacao.map((p, i) => (
              <div key={i} className="flex items-end gap-2">
                <div className="flex-1"><Label>Classificação</Label>
                  <Input value={p.categoria} onChange={(ev) => setC((x) => ({ ...x, pontuacao: x.pontuacao.map((r, j) => j === i ? { ...r, categoria: ev.target.value } : r) }))} /></div>
                <div className="w-28"><Label>Pontos</Label>
                  <Input type="number" min={0} value={p.pontos} onChange={(ev) => setC((x) => ({ ...x, pontuacao: x.pontuacao.map((r, j) => j === i ? { ...r, pontos: Number(ev.target.value) || 0 } : r) }))} /></div>
                <Button size="icon" variant="ghost" aria-label="Remover linha" onClick={() => setC((x) => ({ ...x, pontuacao: x.pontuacao.filter((_, j) => j !== i) }))}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
            <Button variant="outline" onClick={() => setC((x) => ({ ...x, pontuacao: [...x.pontuacao, { categoria: "", pontos: 0 }] }))}><Plus className="h-4 w-4" /> Adicionar linha</Button>
            <div><Label>Observação abaixo da tabela</Label><Textarea rows={3} value={c.notaPontuacao} onChange={(ev) => setC((x) => ({ ...x, notaPontuacao: ev.target.value }))} /></div>
          </TabsContent>

          <TabsContent value="certificados" className="space-y-3">
            {c.certificados.map((cert, i) => (
              <div key={i} className="space-y-2 rounded-lg border border-border p-4">
                <div><Label>Título</Label><Input value={cert.title} onChange={(ev) => setC((x) => ({ ...x, certificados: x.certificados.map((r, j) => j === i ? { ...r, title: ev.target.value } : r) }))} /></div>
                <div><Label>Texto</Label><Textarea rows={3} value={cert.description} onChange={(ev) => setC((x) => ({ ...x, certificados: x.certificados.map((r, j) => j === i ? { ...r, description: ev.target.value } : r) }))} /></div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="links" className="space-y-3">
            {([
              ["diplomasCertificados", "Cadastrar diploma ou certificado"],
              ["cadastroTreinamento", "Cadastrar treinamento"],
              ["agendamentoDireto", "Agendar treinamento existente"],
            ] as const).map(([k, rotulo]) => (
              <div key={k}><Label>{rotulo}</Label>
                <Input value={c.links[k]} onChange={(ev) => setC((x) => ({ ...x, links: { ...x.links, [k]: ev.target.value } }))} /></div>
            ))}
          </TabsContent>
        </Tabs>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={salvar} disabled={salvando || enviando !== null}>{salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
