import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, FileText, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCurrentUser } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { listarDocumentosSharePoint } from "@/lib/documentos-sharepoint.functions";
import { filtrarDocumentos } from "@/lib/documentos-sharepoint.rules";

export const Route = createFileRoute("/_authenticated/documentos")({
  head: () => ({
    meta: [
      { title: "Documentos | Portal do Profissional Cronos" },
      { name: "description", content: "Links para os documentos oficiais da Cronos Logistics." },
      { property: "og:title", content: "Documentos | Portal do Profissional Cronos" },
      { property: "og:description", content: "Documentos oficiais da Cronos Logistics em um só lugar." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DocumentosPage,
});

type Documento = { id: string; titulo: string; url: string; departamento: string | null; cargo: string | null };
const chave = ["documentos"];

async function listar(): Promise<Documento[]> {
  const { data, error } = await supabase.from("documentos").select("id,titulo,url,departamento,cargo").order("titulo");
  if (error) throw error;
  return data;
}

function DocumentosPage() {
  const me = useCurrentUser();
  const pode = Boolean(me.data?.can("documentos.gerenciar"));
  const docs = useQuery({ queryKey: chave, queryFn: listar });
  const sharepoint = useQuery({ queryKey: ["documentos-sharepoint"], queryFn: () => listarDocumentosSharePoint(), staleTime: 60_000 });
  const [busca, setBusca] = useState("");
  const [categoria, setCategoria] = useState<string | undefined>();
  const categorias = ["Qualidade", "Modelo Documental", ...(docs.data?.length ? ["Outros documentos"] : [])];
  const documentos = filtrarDocumentos([
    ...(sharepoint.data?.itens ?? []),
    ...(docs.data ?? []).map(d => ({ ...d, categoria: "Outros documentos", pasta: [d.departamento, d.cargo].filter(Boolean).join(" / ") })),
  ], busca, categoria);
  const qc = useQueryClient();
  const [form, setForm] = useState<{ open: boolean; doc?: Documento | undefined }>({ open: false });
  const excluir = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("documentos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Link removido"); qc.invalidateQueries({ queryKey: chave }); },
    onError: () => toast.error("Não foi possível remover o link."),
  });

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Documentos Cronos</h1>
        </div>
        {pode && <Button onClick={() => setForm({ open: true })}><Plus /> Novo link</Button>}
      </header>
      <div className="mt-6 flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" aria-label="Buscar documento" placeholder="Buscar documento" value={busca} onChange={e => setBusca(e.target.value)} />
        </div>
        <Button size="sm" variant={!categoria ? "default" : "outline"} onClick={() => setCategoria(undefined)}>Todos</Button>
        {categorias.map(c => <Button key={c} size="sm" variant={categoria === c ? "default" : "outline"} onClick={() => setCategoria(c)}>{c}</Button>)}
      </div>
      {(docs.isPending || sharepoint.isPending) && <p className="mt-8 text-sm text-muted-foreground">Carregando documentos…</p>}
      {(sharepoint.error || docs.error) && <p role="alert" className="mt-6 text-sm text-destructive">Não foi possível carregar todos os documentos. <Button variant="link" onClick={() => { void sharepoint.refetch(); void docs.refetch(); }}>Tentar novamente</Button></p>}
      {sharepoint.data?.erros.map(erro => <p key={erro} role="alert" className="mt-6 text-sm text-destructive">{erro}</p>)}
      {!docs.isPending && !sharepoint.isPending && !sharepoint.error && !docs.error && documentos.length === 0 && <p className="mt-8 border-t py-8 text-center text-sm text-muted-foreground">Nenhum documento encontrado.</p>}
      {categorias.filter(c => documentos.some(d => d.categoria === c)).map(c => (
        <section key={c} className="mt-8">
          <h2 className="mb-3 text-lg font-bold text-primary">{c}</h2>
          <div className="divide-y rounded-lg border bg-card">
            {documentos.filter(d => d.categoria === c).map(d => {
              const local = c === "Outros documentos" ? docs.data?.find(item => item.id === d.id) : undefined;
              return <div key={`${c}-${d.id}`} className="flex items-center gap-2 pr-3">
                <a href={d.url} target="_blank" rel="noreferrer" className="flex min-w-0 flex-1 items-center gap-3 p-4 hover:bg-muted/50">
                  <FileText className="h-5 w-5 shrink-0 text-primary" />
                  <div className="min-w-0 flex-1"><p className="break-words font-semibold text-foreground">{d.titulo}</p>{d.pasta && <p className="break-words text-sm text-muted-foreground">{d.pasta}</p>}</div>
                  <span className="flex shrink-0 items-center gap-1 text-sm font-medium text-primary"><span className="hidden sm:inline">Abrir documento</span><ExternalLink className="h-4 w-4" /></span>
                </a>
                {pode && local && <><Button size="icon" variant="ghost" aria-label={`Editar ${d.titulo}`} onClick={() => setForm({ open: true, doc: local })}><Pencil /></Button><Button size="icon" variant="ghost" aria-label={`Remover ${d.titulo}`} onClick={() => confirm(`Remover "${d.titulo}"?`) && excluir.mutate(d.id)}><Trash2 /></Button></>}
              </div>;
            })}
          </div>
        </section>
      ))}
      {form.open && <DocForm doc={form.doc} onClose={() => setForm({ open: false })} />}
    </main>
  );
}

function DocForm({ doc, onClose }: { doc?: Documento | undefined; onClose: () => void }) {
  const qc = useQueryClient();
  const [titulo, setTitulo] = useState(doc?.titulo ?? "");
  const [url, setUrl] = useState(doc?.url ?? "");
  const [departamento, setDepartamento] = useState(doc?.departamento ?? "");
  const [cargo, setCargo] = useState(doc?.cargo ?? "");
  const salvar = useMutation({
    mutationFn: async () => {
      const dados = { titulo: titulo.trim(), url: url.trim(), departamento: departamento.trim() || null, cargo: cargo.trim() || null };
      const { error } = doc
        ? await supabase.from("documentos").update(dados).eq("id", doc.id)
        : await supabase.from("documentos").insert(dados);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Link salvo"); qc.invalidateQueries({ queryKey: chave }); onClose(); },
    onError: () => toast.error("Não foi possível salvar. Confira o título e se o endereço começa com https://."),
  });
  const valido = titulo.trim() && /^https?:\/\//i.test(url.trim());

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{doc ? "Editar link" : "Novo link"}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5"><Label htmlFor="doc-t">Título</Label><Input id="doc-t" maxLength={150} value={titulo} onChange={(e) => setTitulo(e.target.value)} /></div>
          <div className="space-y-1.5"><Label htmlFor="doc-u">Endereço (URL)</Label><Input id="doc-u" placeholder="https://" value={url} onChange={(e) => setUrl(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label htmlFor="doc-d">Departamento</Label><Input id="doc-d" maxLength={100} placeholder="Todos" value={departamento} onChange={(e) => setDepartamento(e.target.value)} /></div>
            <div className="space-y-1.5"><Label htmlFor="doc-c">Cargo</Label><Input id="doc-c" maxLength={100} placeholder="Todos" value={cargo} onChange={(e) => setCargo(e.target.value)} /></div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button disabled={!valido || salvar.isPending} onClick={() => salvar.mutate()}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
