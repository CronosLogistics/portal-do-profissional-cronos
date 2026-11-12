import { useEffect, useRef, useState } from "react";
import { Bold, Italic, Link2, List, ListOrdered } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GifPicker } from "@/components/portal/GifPicker";
import { MencaoPicker } from "@/components/portal/MencaoPicker";
import { tokenMencao, type Mencionavel } from "@/lib/mencoes";
import { gifPermitido } from "@/lib/giphy";
import { linkPermitido, textoParaEditor } from "@/lib/rich-text";

export function EditorTexto({ initial, onChange, label = "Mensagem", id, permitirGif = false, permitirMencao = false }: { initial: string; onChange: (html: string) => void; label?: string; id?: string; permitirGif?: boolean; permitirMencao?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const range = useRef<Range | null>(null);
  const ultimo = useRef<string | null>(null);
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [texto, setTexto] = useState("");
  const [erro, setErro] = useState("");
  const [mencaoAberta, setMencaoAberta] = useState(false);
  const inserirMencao = (m: Mencionavel) => {
    const editor = ref.current;
    if (!editor) return;
    editor.focus();
    const sel = window.getSelection();
    if (!sel?.rangeCount || !editor.contains(sel.anchorNode)) { const r = document.createRange(); r.selectNodeContents(editor); r.collapse(false); sel?.removeAllRanges(); sel?.addRange(r); }
    const s = window.getSelection();
    const no = s?.anchorNode; const off = s?.anchorOffset ?? 0;
    // Replace a just-typed "@" that opened the picker.
    if (no?.nodeType === Node.TEXT_NODE && off > 0 && no.textContent?.[off - 1] === "@") { const r = document.createRange(); r.setStart(no, off - 1); r.setEnd(no, off); s?.removeAllRanges(); s?.addRange(r); }
    document.execCommand("insertText", false, `${tokenMencao(m)} `);
    emitir();
  };
  useEffect(() => {
    if (ref.current && initial !== ultimo.current) ref.current.innerHTML = textoParaEditor(initial);
  }, [initial]);
  const emitir = () => { const html = ref.current?.innerHTML ?? ""; ultimo.current = html; onChange(html); };
  const cmd = (c: string) => { ref.current?.focus(); document.execCommand(c, false); emitir(); };
  const abrirLink = () => {
    const selection = window.getSelection();
    range.current = selection?.rangeCount && ref.current?.contains(selection.anchorNode) ? selection.getRangeAt(0).cloneRange() : null;
    setTexto(range.current?.toString() ?? ""); setUrl(""); setErro(""); setOpen(true);
  };
  const inserir = () => {
    if (!linkPermitido(url)) { setErro("Use um endereço https://, http:// ou mailto:."); return; }
    const editor = ref.current;
    if (!editor) return;
    editor.focus();
    const selecionado = range.current ?? document.createRange();
    if (!range.current) { selecionado.selectNodeContents(editor); selecionado.collapse(false); }
    const selection = window.getSelection(); selection?.removeAllRanges(); selection?.addRange(selecionado);
    const a = document.createElement("a"); a.href = url.trim(); a.textContent = texto.trim() || url.trim();
    // execCommand preserves the browser's undo history and uses the restored selection.
    document.execCommand("insertHTML", false, a.outerHTML);
    emitir(); setOpen(false);
  };
  const inserirGif = (url: string) => {
    const editor = ref.current;
    if (!editor || !gifPermitido(url)) return;
    editor.focus();
    const sel = window.getSelection();
    if (!sel?.rangeCount || !editor.contains(sel.anchorNode)) { const r = document.createRange(); r.selectNodeContents(editor); r.collapse(false); sel?.removeAllRanges(); sel?.addRange(r); }
    const img = document.createElement("img"); img.src = url; img.alt = "GIF";
    document.execCommand("insertHTML", false, `${img.outerHTML}<br>`);
    emitir();
  };
  const tools = [{ icon: Bold, label: "Negrito", run: () => cmd("bold") }, { icon: Italic, label: "Itálico", run: () => cmd("italic") }, { icon: List, label: "Lista", run: () => cmd("insertUnorderedList") }, { icon: ListOrdered, label: "Lista numerada", run: () => cmd("insertOrderedList") }, { icon: Link2, label: "Link", run: abrirLink }];
  return <>
    <div className="rounded-md border border-input">
      <div className="flex flex-wrap gap-1 border-b p-1">{tools.map(t => <Button key={t.label} type="button" variant="ghost" size="icon" className="h-8 w-8" title={t.label} aria-label={t.label} onMouseDown={e => e.preventDefault()} onClick={t.run}><t.icon /></Button>)}{permitirMencao && <MencaoPicker open={mencaoAberta} onOpenChange={setMencaoAberta} onSelect={inserirMencao} />}{permitirGif && <GifPicker onSelect={inserirGif} className="ml-1" />}</div>
      <div id={id} ref={ref} contentEditable role="textbox" aria-multiline="true" aria-label={label} className="aviso-html min-h-[160px] break-words px-3 py-2 text-sm outline-none" onInput={e => { emitir(); if (permitirMencao && (e.nativeEvent as InputEvent).data === "@") setMencaoAberta(true); }} onPaste={e => { e.preventDefault(); document.execCommand("insertText", false, e.clipboardData.getData("text/plain")); emitir(); }} />
    </div>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-w-md" onCloseAutoFocus={e => { e.preventDefault(); ref.current?.focus(); }}>
      <DialogHeader><DialogTitle>Inserir link</DialogTitle></DialogHeader>
      <div className="grid gap-2"><Label htmlFor={`${id ?? "mensagem"}-link-url`}>Endereço do link</Label><Input id={`${id ?? "mensagem"}-link-url`} value={url} onChange={e => { setUrl(e.target.value); setErro(""); }} placeholder="https://" /></div>
      <div className="grid gap-2"><Label htmlFor={`${id ?? "mensagem"}-link-texto`}>Texto exibido no link</Label><Input id={`${id ?? "mensagem"}-link-texto`} value={texto} onChange={e => setTexto(e.target.value)} placeholder="Ex.: Acessar formulário" /></div>
      {erro && <p role="alert" className="text-sm text-destructive">{erro}</p>}
      {url && <p className="break-words text-sm text-accent underline">{texto.trim() || url}</p>}
      <DialogFooter><Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button><Button type="button" disabled={!url.trim()} onClick={inserir}>Inserir link</Button></DialogFooter>
    </DialogContent></Dialog>
  </>;
}