import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bold, Eye, Italic, Link2, List, ListOrdered, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { avisosKey, perfisRemetentes, salvarAviso, type AvisoEnviado } from "@/lib/avisos-client";
import { brasiliaParaUtc, statusAviso, TITULO_MAX, utcParaBrasilia } from "@/lib/avisos-rules";
import { AvisoHtml } from "./AvisoLeitura";
import { formatarDataBrasilia } from "@/lib/avisos-rules";

function EditorSimples({ initial, onChange }: { initial: string; onChange: (html: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.innerHTML = initial;
  }, [initial]);
  const cmd = (c: string, v?: string) => {
    ref.current?.focus();
    document.execCommand(c, false, v);
    onChange(ref.current?.innerHTML ?? "");
  };
  const tools = [
    { icon: Bold, label: "Negrito", run: () => cmd("bold") },
    { icon: Italic, label: "Itálico", run: () => cmd("italic") },
    { icon: List, label: "Lista", run: () => cmd("insertUnorderedList") },
    { icon: ListOrdered, label: "Lista numerada", run: () => cmd("insertOrderedList") },
    {
      icon: Link2,
      label: "Link",
      run: () => {
        const url = window.prompt("Endereço do link (https://...)");
        if (url && /^(https?:|mailto:)/i.test(url.trim())) cmd("createLink", url.trim());
        else if (url) toast.error("Use um endereço começando com https://");
      },
    },
  ];
  return (
    <div className="rounded-md border border-input">
      <div className="flex gap-1 border-b p-1">
        {tools.map((t) => (
          <Button key={t.label} type="button" variant="ghost" size="icon" className="h-8 w-8" title={t.label} aria-label={t.label} onMouseDown={(e) => e.preventDefault()} onClick={t.run}>
            <t.icon />
          </Button>
        ))}
      </div>
      <div
        ref={ref}
        contentEditable
        role="textbox"
        aria-multiline="true"
        aria-label="Mensagem"
        className="aviso-html min-h-[160px] px-3 py-2 text-sm outline-none"
        onInput={(e) => onChange((e.target as HTMLDivElement).innerHTML)}
      />
    </div>
  );
}

export function AvisoForm({ open, onClose, aviso }: { open: boolean; onClose: () => void; aviso?: AvisoEnviado | null }) {
  const qc = useQueryClient();
  const perfis = useQuery({ queryKey: [...avisosKey, "remetentes"], queryFn: perfisRemetentes, enabled: open });
  const publicado = aviso ? statusAviso(aviso) !== "Agendado" : false;
  const [perfilId, setPerfilId] = useState("");
  const [titulo, setTitulo] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [inicial, setInicial] = useState("");
  const [quando, setQuando] = useState<"agora" | "agendar">("agora");
  const [agendarEm, setAgendarEm] = useState("");
  const [expiraEm, setExpiraEm] = useState("");
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    if (!open) return;
    setPreview(false);
    setPerfilId(aviso?.perfil_id ?? "");
    setTitulo(aviso?.titulo ?? "");
    setMensagem(aviso?.mensagem ?? "");
    setInicial(aviso?.mensagem ?? "");
    setQuando(aviso && statusAviso(aviso) === "Agendado" ? "agendar" : "agora");
    setAgendarEm(aviso ? utcParaBrasilia(aviso.publicar_em) : "");
    setExpiraEm(aviso?.expira_em ? utcParaBrasilia(aviso.expira_em) : "");
  }, [open, aviso]);

  useEffect(() => {
    if (!aviso && !perfilId && perfis.data?.length === 1 && perfis.data[0]) setPerfilId(perfis.data[0].id);
  }, [perfis.data, perfilId, aviso]);

  const salvar = useMutation({
    mutationFn: () => {
      if (quando === "agendar" && !agendarEm && !publicado) throw new Error("Informe a data e hora do agendamento.");
      const publicarEm = publicado ? aviso!.publicar_em : quando === "agora" ? new Date().toISOString() : brasiliaParaUtc(agendarEm);
      return salvarAviso({ perfil_id: perfilId, titulo, mensagem, publicar_em: publicarEm, expira_em: expiraEm ? brasiliaParaUtc(expiraEm) : null }, aviso?.id);
    },
    onSuccess: async () => {
      toast.success(aviso ? "Aviso atualizado." : quando === "agora" ? "Aviso publicado." : "Aviso agendado.");
      await qc.invalidateQueries({ queryKey: avisosKey });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const nomePerfil = perfis.data?.find((p) => p.id === perfilId)?.nome ?? aviso?.perfil_nome ?? "Perfil";
  const remetentes = perfis.data ?? [];
  const remetenteFixo = publicado || (aviso && !remetentes.some((p) => p.id === aviso.perfil_id));

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90dvh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{aviso ? (publicado ? "Corrigir aviso publicado" : "Editar aviso agendado") : "Novo aviso"}</DialogTitle>
        </DialogHeader>
        {preview ? (
          <div className="rounded-lg border p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-accent">{nomePerfil}</p>
            <h3 className="mt-1 text-xl font-bold">{titulo || "Sem título"}</h3>
            <p className="mb-3 text-sm text-muted-foreground">
              {formatarDataBrasilia(quando === "agendar" && agendarEm ? brasiliaParaUtc(agendarEm) : new Date().toISOString())}
            </p>
            <AvisoHtml html={mensagem} />
          </div>
        ) : (
          <div className="grid gap-4">
            {publicado && <p className="rounded-md bg-muted p-3 text-sm">O aviso já foi publicado: a correção recebe a marca “editado” e ninguém é notificado de novo.</p>}
            <div className="grid gap-2">
              <Label>Enviar como</Label>
              {remetenteFixo ? (
                <Input value={nomePerfil} disabled />
              ) : (
                <Select value={perfilId} onValueChange={setPerfilId}>
                  <SelectTrigger><SelectValue placeholder={perfis.isLoading ? "Carregando..." : "Escolha o perfil"} /></SelectTrigger>
                  <SelectContent>{remetentes.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}</SelectContent>
                </Select>
              )}
              {!perfis.isLoading && !remetentes.length && !aviso && <p className="text-xs text-destructive">Você não faz parte de nenhum perfil que pode publicar avisos.</p>}
            </div>
            <div className="grid gap-2">
              <div className="flex justify-between"><Label htmlFor="aviso-titulo">Título</Label><span className="text-xs text-muted-foreground">{titulo.length}/{TITULO_MAX}</span></div>
              <Input id="aviso-titulo" value={titulo} maxLength={TITULO_MAX} onChange={(e) => setTitulo(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Mensagem</Label>
              <EditorSimples initial={inicial} onChange={setMensagem} />
            </div>
            {!publicado && (
              <div className="grid gap-2">
                <Label>Publicação</Label>
                <RadioGroup value={quando} onValueChange={(v) => setQuando(v as "agora" | "agendar")} className="flex gap-6">
                  <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="agora" />Publicar agora</label>
                  <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="agendar" />Agendar</label>
                </RadioGroup>
                {quando === "agendar" && <Input type="datetime-local" value={agendarEm} onChange={(e) => setAgendarEm(e.target.value)} aria-label="Data e hora da publicação" />}
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="aviso-expira">Expira em (opcional, horário de Brasília)</Label>
              <Input id="aviso-expira" type="datetime-local" value={expiraEm} onChange={(e) => setExpiraEm(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Para</Label>
              <Input value="Todos os profissionais ativos" disabled />
            </div>
          </div>
        )}
        <DialogFooter className="gap-2 sm:justify-between">
          <Button type="button" variant="outline" onClick={() => setPreview((v) => !v)}>
            {preview ? <><Pencil />Voltar a editar</> : <><Eye />Pré-visualizar</>}
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button type="button" disabled={salvar.isPending || !perfilId || !titulo.trim()} onClick={() => salvar.mutate()}>
              {salvar.isPending ? "Salvando..." : aviso ? "Salvar" : quando === "agora" ? "Publicar" : "Agendar"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
