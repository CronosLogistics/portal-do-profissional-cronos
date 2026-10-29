import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, FileText, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCurrentUser } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

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

type Documento = { id: string; titulo: string; url: string };
const chave = ["documentos"];

async function listar(): Promise<Documento[]> {
  const { data, error } = await supabase.from("documentos").select("id,titulo,url").order("titulo");
  if (error) throw error;
  return data;
}

function DocumentosPage() {
  const me = useCurrentUser();
  const pode = Boolean(me.data?.can("documentos.gerenciar"));
  const docs = useQuery({ queryKey: chave, queryFn: listar });
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
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Documentos</h1>
          <p className="mt-1 text-sm text-muted-foreground">Documentos oficiais da Cronos Logistics (abrem em nova aba).</p>
        </div>
        {pode && <Button onClick={() => setForm({ open: true })}><Plus /> Novo link</Button>}
      </header>
      {docs.isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
      {docs.data?.length === 0 && (
        <p className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">Nenhum documento disponível por enquanto.</p>
      )}
      {!!docs.data?.length && (
        <div className="divide-y rounded-lg border bg-card">
          {docs.data.map((d) => (
            <div key={d.id} className="flex items-center gap-3 p-4">
              <FileText className="h-5 w-5 shrink-0 text-primary" />
              <a href={d.url} target="_blank" rel="noreferrer" className="flex-1 font-semibold text-foreground hover:text-primary">
                {d.titulo} <ExternalLink className="ml-1 inline h-3.5 w-3.5" />
              </a>
              {pode && (
                <>
                  <Button size="icon" variant="ghost" aria-label="Editar" onClick={() => setForm({ open: true, doc: d })}><Pencil /></Button>
                  <Button size="icon" variant="ghost" aria-label="Remover" onClick={() => confirm(`Remover "${d.titulo}"?`) && excluir.mutate(d.id)}><Trash2 /></Button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
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
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button disabled={!valido || salvar.isPending} onClick={() => salvar.mutate()}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
