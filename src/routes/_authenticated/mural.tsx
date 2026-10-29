import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageCircle, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCurrentUser } from "@/hooks/useAuth";
import {
  apagarComentario, comentar, editarComentario, excluirPost, listarMural, muralKey, salvarPost, urlImagem,
  type ComentarioMural, type PostMural,
} from "@/lib/mural-client";

export const Route = createFileRoute("/_authenticated/mural")({
  validateSearch: (s: Record<string, unknown>): { post?: string } => (typeof s["post"] === "string" ? { post: s["post"] } : {}),
  head: () => ({
    meta: [
      { title: "Mural de comemorações | Portal do Profissional Cronos" },
      { name: "description", content: "Aniversários e comemorações dos profissionais da Cronos Logistics." },
      { property: "og:title", content: "Mural de comemorações | Portal do Profissional Cronos" },
      { property: "og:description", content: "Celebre com os colegas: aniversários e conquistas da Cronos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MuralPage,
});

const hojeBrasil = () => new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
const dataBR = (d: string) => d.split("-").reverse().join("/");

function MuralPage() {
  const { post: foco } = Route.useSearch();
  const me = useCurrentUser();
  const podeEditar = Boolean(me.data?.can("conteudo.editar"));
  const posts = useQuery({ queryKey: muralKey, queryFn: listarMural });
  const [form, setForm] = useState<{ open: boolean; post?: PostMural | null }>({ open: false });

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Mural de comemorações</h1>
          <p className="mt-1 text-sm text-muted-foreground">Aniversários e conquistas da nossa equipe. Deixe sua mensagem!</p>
        </div>
        {podeEditar && <Button onClick={() => setForm({ open: true })}><Plus /> Novo post</Button>}
      </header>
      {posts.isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
      {posts.data?.length === 0 && <p className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">Nenhuma comemoração publicada ainda.</p>}
      <ol className="mural-timeline">
        {posts.data?.map((p) => (
          <PostCard key={p.id} post={p} emFoco={p.id === foco} meuId={me.data?.id} podeEditar={podeEditar} onEditar={() => setForm({ open: true, post: p })} />
        ))}
      </ol>
      {form.open && <PostForm post={form.post ?? null} onClose={() => setForm({ open: false })} />}
    </main>
  );
}

function PostCard({ post, emFoco, meuId, podeEditar, onEditar }: { post: PostMural; emFoco: boolean; meuId?: string; podeEditar: boolean; onEditar: () => void }) {
  const qc = useQueryClient();
  const ref = useRef<HTMLLIElement>(null);
  const campo = useRef<HTMLTextAreaElement>(null);
  const [img, setImg] = useState<string | null>(null);
  const [texto, setTexto] = useState("");
  useEffect(() => { urlImagem(post.imagem_path).then(setImg); }, [post.imagem_path]);
  useEffect(() => {
    if (!emFoco) return;
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    setTimeout(() => campo.current?.focus({ preventScroll: true }), 400);
  }, [emFoco]);
  const atualizar = () => qc.invalidateQueries({ queryKey: muralKey });
  const enviar = useMutation({
    mutationFn: () => comentar(post.id, texto),
    onSuccess: () => { setTexto(""); atualizar(); },
    onError: () => toast.error("Não foi possível comentar."),
  });
  const excluir = useMutation({ mutationFn: () => excluirPost(post.id), onSuccess: () => { toast.success("Post removido."); atualizar(); } });

  return (
    <li ref={ref} className={`mural-post ${emFoco ? "is-focus" : ""}`} id={`post-${post.id}`}>
      <span className="mural-data">{dataBR(post.data_post)}</span>
      <article className="rounded-lg border bg-card p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-xl font-bold text-foreground">{post.titulo}</h2>
          {podeEditar && (
            <div className="flex gap-1">
              <Button size="icon" variant="ghost" aria-label="Editar post" onClick={onEditar}><Pencil /></Button>
              <Button size="icon" variant="ghost" aria-label="Excluir post" onClick={() => confirm("Excluir este post e seus comentários?") && excluir.mutate()}><Trash2 /></Button>
            </div>
          )}
        </div>
        {post.texto && <p className="mt-2 whitespace-pre-line text-sm text-foreground">{post.texto}</p>}
        {img && <img src={img} alt={post.titulo} className="mt-4 w-full rounded-md border object-cover" loading="lazy" />}
        <div className="mt-5 border-t pt-4">
          <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-primary"><MessageCircle className="size-4" /> {post.comentarios.length} {post.comentarios.length === 1 ? "comentário" : "comentários"}</p>
          <ul className="space-y-3">
            {post.comentarios.map((c) => <Comentario key={c.id} c={c} meu={c.usuario_id === meuId} podeRemover={podeEditar} onMudou={atualizar} />)}
          </ul>
          <form className="mt-4 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (texto.trim()) enviar.mutate(); }}>
            <Textarea ref={campo} rows={2} maxLength={1000} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Escreva sua mensagem de parabéns…" aria-label="Comentário" />
            <Button type="submit" disabled={!texto.trim() || enviar.isPending}>Comentar</Button>
          </form>
        </div>
      </article>
    </li>
  );
}

function Comentario({ c, meu, podeRemover, onMudou }: { c: ComentarioMural; meu: boolean; podeRemover: boolean; onMudou: () => void }) {
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState(c.texto);
  const salvar = async () => { try { await editarComentario(c.id, texto); setEditando(false); onMudou(); } catch { toast.error("Não foi possível editar."); } };
  const apagar = async () => { if (!confirm("Apagar este comentário?")) return; try { await apagarComentario(c.id); onMudou(); } catch { toast.error("Não foi possível apagar."); } };
  return (
    <li className="rounded-md bg-muted/50 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-foreground">{c.nome}</p>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          {new Date(c.criado_em).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" })}
          {c.editado_em && " · editado"}
          {meu && !editando && <Button size="icon" variant="ghost" className="size-7" aria-label="Editar comentário" onClick={() => setEditando(true)}><Pencil /></Button>}
          {(meu || podeRemover) && <Button size="icon" variant="ghost" className="size-7" aria-label="Apagar comentário" onClick={apagar}><Trash2 /></Button>}
        </div>
      </div>
      {editando ? (
        <div className="mt-2 space-y-2">
          <Textarea rows={2} maxLength={1000} value={texto} onChange={(e) => setTexto(e.target.value)} />
          <div className="flex gap-2"><Button size="sm" onClick={salvar} disabled={!texto.trim()}>Salvar</Button><Button size="sm" variant="ghost" onClick={() => { setTexto(c.texto); setEditando(false); }}>Cancelar</Button></div>
        </div>
      ) : <p className="mt-1 whitespace-pre-line text-sm text-foreground">{c.texto}</p>}
    </li>
  );
}

function PostForm({ post, onClose }: { post: PostMural | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [titulo, setTitulo] = useState(post?.titulo ?? "");
  const [texto, setTexto] = useState(post?.texto ?? "");
  const [data, setData] = useState(post?.data_post ?? hojeBrasil());
  const [ate, setAte] = useState(post?.visivel_ate ?? "");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const salvar = useMutation({
    mutationFn: () => salvarPost(post?.id ?? null, { titulo, texto, data_post: data, visivel_ate: ate || null, arquivo, imagem_path: post?.imagem_path ?? null }),
    onSuccess: () => { toast.success("Post publicado."); qc.invalidateQueries({ queryKey: muralKey }); onClose(); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{post ? "Editar post" : "Novo post no mural"}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label htmlFor="mt">Título</Label><Input id="mt" maxLength={120} value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Feliz aniversário, Maria!" /></div>
          <div><Label htmlFor="mx">Texto</Label><Textarea id="mx" rows={4} value={texto} onChange={(e) => setTexto(e.target.value)} /></div>
          <div><Label htmlFor="mi">Imagem (ex.: arte de parabéns)</Label><Input id="mi" type="file" accept="image/*" onChange={(e) => setArquivo(e.target.files?.[0] ?? null)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label htmlFor="md">Data do post</Label><Input id="md" type="date" value={data} onChange={(e) => setData(e.target.value)} /></div>
            <div><Label htmlFor="ma">No carrossel até</Label><Input id="ma" type="date" value={ate} onChange={(e) => setAte(e.target.value)} /></div>
          </div>
          <p className="text-xs text-muted-foreground">Sem data final, o post fica 3 dias no carrossel da Início. No mural ele permanece sempre.</p>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => salvar.mutate()} disabled={!titulo.trim() || !data || salvar.isPending}>{post ? "Salvar" : "Publicar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
