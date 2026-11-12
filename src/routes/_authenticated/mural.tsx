import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageCircle, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MencaoPicker, TextoComMencoes, inserirMencaoEmTexto } from "@/components/portal/MencaoPicker";
import { consultaMencaoAtiva, tokenMencao } from "@/lib/mencoes";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { avisosKey } from "@/lib/avisos-client";
import { GifAnexo } from "@/components/avisos/AvisoLeitura";
import { gifPermitido } from "@/lib/giphy";
import { useCurrentUser } from "@/hooks/useAuth";
import {
  apagarComentario, comentar, editarComentario, EMOJIS_MURAL, excluirPost, listarMural, muralKey, postAgendado, reagirPost, salvarPost, urlImagem,
  marcarMuralLido, type ComentarioMural, type EmojiMural, type PostMural, type TipoMural,
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

function ListaPosts({
  posts, vazio, foco, meuId, podeEditar, onEditar,
}: {
  posts: PostMural[];
  vazio: string;
  foco?: string | undefined;
  meuId: string | undefined;
  podeEditar: boolean;
  onEditar: (p: PostMural) => void;
}) {
  if (posts.length === 0) {
    return <p className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">{vazio}</p>;
  }
  return (
    <ol className="mural-timeline">
      {posts.map((p) => (
        <PostCard key={p.id} post={p} emFoco={p.id === foco} meuId={meuId} podeEditar={podeEditar} onEditar={() => onEditar(p)} />
      ))}
    </ol>
  );
}

function MuralPage() {
  const { post: foco } = Route.useSearch();
  const me = useCurrentUser();
  const podeEditar = Boolean(me.data?.can("conteudo.editar"));
  const posts = useQuery({ queryKey: muralKey, queryFn: listarMural });
  const [form, setForm] = useState<{ open: boolean; post?: PostMural | null }>({ open: false });
  const lista = posts.data ?? [];
  const publicados = lista.filter((p) => !postAgendado(p));
  const agendados = lista.filter((p) => postAgendado(p));
  const [aba, setAba] = useState("publicados");
  useEffect(() => {
    if (!foco || !posts.data) return;
    if (posts.data.some((p) => p.id === foco && postAgendado(p))) setAba("agendados");
  }, [foco, posts.data]);
  const editar = (p: PostMural) => setForm({ open: true, post: p });

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
      {!posts.isLoading && podeEditar ? (
        <Tabs value={aba} onValueChange={setAba}>
          <TabsList>
            <TabsTrigger value="publicados">Publicados</TabsTrigger>
            <TabsTrigger value="agendados">Agendados{agendados.length ? ` (${agendados.length})` : ""}</TabsTrigger>
          </TabsList>
          <TabsContent value="publicados">
            <ListaPosts posts={publicados} vazio="Nenhuma comemoração publicada ainda." foco={foco} meuId={me.data?.id} podeEditar={podeEditar} onEditar={editar} />
          </TabsContent>
          <TabsContent value="agendados">
            <ListaPosts posts={agendados} vazio="Nenhum post agendado." foco={foco} meuId={me.data?.id} podeEditar={podeEditar} onEditar={editar} />
          </TabsContent>
        </Tabs>
      ) : !posts.isLoading ? (
        <ListaPosts posts={publicados} vazio="Nenhuma comemoração publicada ainda." foco={foco} meuId={me.data?.id} podeEditar={podeEditar} onEditar={editar} />
      ) : null}
      {form.open && <PostForm post={form.post ?? null} onClose={() => setForm({ open: false })} />}
    </main>
  );
}

function PostCard({ post, emFoco, meuId, podeEditar, onEditar }: { post: PostMural; emFoco: boolean; meuId: string | undefined; podeEditar: boolean; onEditar: () => void }) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!emFoco || post.tipo === "geral") return;
    void marcarMuralLido(post.id).then(() => qc.invalidateQueries({ queryKey: avisosKey })).catch(() => toast.error("Não foi possível registrar a leitura."));
  }, [emFoco, post.id, post.tipo, qc]);
  const ref = useRef<HTMLLIElement>(null);
  const campo = useRef<HTMLTextAreaElement>(null);
  const [img, setImg] = useState<string | null>(null);
  const [texto, setTexto] = useState("");
  const [mencao, setMencao] = useState(false);
  const [consultaMencao, setConsultaMencao] = useState<string | null>(null);
  const [gif, setGif] = useState<string | null>(null);
  const [confirmExcluir, setConfirmExcluir] = useState(false);
  useEffect(() => { urlImagem(post.imagem_path).then(setImg); }, [post.imagem_path]);
  useEffect(() => {
    if (!emFoco) return;
    const timeline = ref.current?.parentElement;
    if (!timeline) return;
    let frame = 0;
    let stopped = false;
    // Images (including earlier posts) can change the comment's position after navigation.
    const posicionar = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (stopped) return;
        campo.current?.scrollIntoView({ behavior: "instant", block: "center" });
        campo.current?.focus({ preventScroll: true });
      });
    };
    const observer = new ResizeObserver(posicionar);
    const parar = () => {
      stopped = true;
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
    observer.observe(timeline);
    posicionar();
    // Never fight scrolling or typing once the person starts interacting.
    const eventos = ["wheel", "touchstart", "pointerdown", "keydown"] as const;
    eventos.forEach((evento) => window.addEventListener(evento, parar, { passive: true, once: true }));
    const timeout = window.setTimeout(parar, 10_000);
    return () => {
      parar();
      window.clearTimeout(timeout);
      eventos.forEach((evento) => window.removeEventListener(evento, parar));
    };
  }, [emFoco, post.id]);
  const atualizar = () => qc.invalidateQueries({ queryKey: muralKey });
  const enviar = useMutation({
    mutationFn: () => comentar(post.id, texto, gif),
    onSuccess: () => { setTexto(""); setGif(null); atualizar(); },
    onError: () => toast.error("Não foi possível comentar."),
  });
  const excluir = useMutation({
    mutationFn: () => excluirPost(post.id),
    onSuccess: () => { toast.success("Post removido."); setConfirmExcluir(false); atualizar(); qc.invalidateQueries({ queryKey: avisosKey }); },
    onError: () => toast.error("Não foi possível excluir o post."),
  });
  const reagir = useMutation({
    mutationFn: (emoji: EmojiMural) => reagirPost(post.id, emoji, post.minha_reacao),
    onSuccess: () => atualizar(),
    onError: () => toast.error("Não foi possível registrar a reação."),
  });

  return (
    <li ref={ref} className={`mural-post ${emFoco ? "is-focus" : ""}`} id={`post-${post.id}`}>
      <span className="mural-data">{postAgendado(post) ? `Agendado para ${dataBR(post.data_post)}${post.publicar_em ? " às " + new Date(post.publicar_em).toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" }) : ""}` : dataBR(post.data_post)}</span>
      <article className="rounded-lg border bg-card p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <h2 id={`titulo-post-${post.id}`} className="text-xl font-bold text-foreground">{post.titulo}</h2>
          {podeEditar && (
            <div className="flex gap-1">
              <Button size="icon" variant="ghost" aria-label="Editar post" onClick={onEditar}><Pencil /></Button>
              <Button size="icon" variant="ghost" aria-label="Excluir post" onClick={() => setConfirmExcluir(true)}><Trash2 /></Button>
            </div>
          )}
        </div>
        {post.texto && <TextoComMencoes texto={post.texto} className="mt-2 whitespace-pre-line text-sm text-foreground" />}
        {img && <img src={img} alt={post.titulo} className="mt-4 w-full rounded-md border object-cover" loading="lazy" />}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {EMOJIS_MURAL.map((e) => {
            const r = post.reacoes.find((x) => x.emoji === e);
            return (
              <button
                key={e}
                type="button"
                className={`compilado-reacao-chip${r?.meu ? " is-ativo" : ""}`}
                aria-pressed={Boolean(r?.meu)}
                aria-label={`Reagir com ${e}`}
                disabled={reagir.isPending}
                onClick={() => reagir.mutate(e)}
              >
                <span>{e}</span>
                {r ? <span className="text-xs font-semibold">{r.total}</span> : null}
              </button>
            );
          })}
        </div>
        <div className="mt-5 border-t pt-4">
          <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-primary"><MessageCircle className="size-4" /> {post.comentarios.length} {post.comentarios.length === 1 ? "comentário" : "comentários"}</p>
          <ul className="space-y-3">
            {post.comentarios.map((c) => <Comentario key={c.id} c={c} meu={c.usuario_id === meuId} podeRemover={podeEditar} onMudou={atualizar} />)}
          </ul>
          <form className="mt-4 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (texto.trim() || gif) enviar.mutate(); }}>
            <div className="flex-1 space-y-2">
              <Textarea ref={campo} rows={2} maxLength={1000} value={texto} onChange={(e) => {
                const v = e.target.value;
                setTexto(v);
                const pos = e.target.selectionStart ?? v.length;
                const q = consultaMencaoAtiva(v.slice(0, pos));
                if (q === null) { setMencao(false); setConsultaMencao(null); }
                else { setMencao(true); setConsultaMencao(q); }
              }} placeholder="Escreva sua mensagem de parabéns… (use @ para mencionar)" aria-label="Comentário" aria-describedby={`titulo-post-${post.id}`} />
              <div className="flex items-center gap-1"><MencaoPicker open={mencao} onOpenChange={(v) => { setMencao(v); if (!v) setConsultaMencao(null); }} consulta={consultaMencao} onSelect={(m) => { setTexto((t) => inserirMencaoEmTexto(t, campo.current, tokenMencao(m))); setConsultaMencao(null); }} /><GifAnexo gif={gif} onChange={setGif} /></div>
            </div>
            <Button type="submit" disabled={(!texto.trim() && !gif) || enviar.isPending}>Comentar</Button>
          </form>
        </div>
      </article>
      <AlertDialog open={confirmExcluir} onOpenChange={setConfirmExcluir}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir este post?</AlertDialogTitle>
            <AlertDialogDescription>O post e todos os comentários serão removidos. Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => excluir.mutate()} disabled={excluir.isPending}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </li>
  );
}

function Comentario({ c, meu, podeRemover, onMudou }: { c: ComentarioMural; meu: boolean; podeRemover: boolean; onMudou: () => void }) {
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState(c.texto);
  const [confirmApagar, setConfirmApagar] = useState(false);
  const salvar = async () => { try { await editarComentario(c.id, texto); setEditando(false); onMudou(); } catch { toast.error("Não foi possível editar."); } };
  const apagar = useMutation({
    mutationFn: () => apagarComentario(c.id),
    onSuccess: () => { setConfirmApagar(false); onMudou(); },
    onError: () => toast.error("Não foi possível apagar."),
  });
  return (
    <li className="rounded-md bg-muted/50 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-foreground">{c.nome}</p>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          {new Date(c.criado_em).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" })}
          {c.editado_em && " · editado"}
          {meu && !editando && <Button size="icon" variant="ghost" className="size-7" aria-label="Editar comentário" onClick={() => setEditando(true)}><Pencil /></Button>}
          {(meu || podeRemover) && <Button size="icon" variant="ghost" className="size-7" aria-label="Apagar comentário" onClick={() => setConfirmApagar(true)}><Trash2 /></Button>}
        </div>
      </div>
      {editando ? (
        <div className="mt-2 space-y-2">
          <Textarea rows={2} maxLength={1000} value={texto} onChange={(e) => setTexto(e.target.value)} />
          <div className="flex gap-2"><Button size="sm" onClick={salvar} disabled={!texto.trim() && !c.gif_url}>Salvar</Button><Button size="sm" variant="ghost" onClick={() => { setTexto(c.texto); setEditando(false); }}>Cancelar</Button></div>
        </div>
      ) : c.texto ? <TextoComMencoes texto={c.texto} className="mt-1 whitespace-pre-line text-sm text-foreground" /> : null}
      {!editando && gifPermitido(c.gif_url) && <img src={c.gif_url} alt="GIF" loading="lazy" className="comentario-gif" />}
      <AlertDialog open={confirmApagar} onOpenChange={setConfirmApagar}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar este comentário?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => apagar.mutate()} disabled={apagar.isPending}>Apagar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </li>
  );
}

function PostForm({ post, onClose }: { post: PostMural | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [titulo, setTitulo] = useState(post?.titulo ?? "");
  const [texto, setTexto] = useState(post?.texto ?? "");
  const [mencao, setMencao] = useState(false);
  const [consultaMencao, setConsultaMencao] = useState<string | null>(null);
  const campoTexto = useRef<HTMLTextAreaElement>(null);
  const hoje = hojeBrasil();
  const futuro = Boolean(post && postAgendado(post, hoje));
  const horaSP = (iso: string) => new Date(iso).toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit", hour12: false });
  const [agendar, setAgendar] = useState(futuro);
  const [dataAgendada, setDataAgendada] = useState(futuro ? post!.data_post : "");
  const [horaAgendada, setHoraAgendada] = useState(futuro && post!.publicar_em ? horaSP(post!.publicar_em) : "08:00");
  const data = agendar ? dataAgendada : (post && !futuro ? post.data_post : hoje);
  const publicarEm = agendar && dataAgendada && horaAgendada ? new Date(`${dataAgendada}T${horaAgendada}:00-03:00`).toISOString() : (post && !futuro ? post.publicar_em : null);
  const dataInvalida = agendar && (!publicarEm || new Date(publicarEm) <= new Date());
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [tipo, setTipo] = useState<TipoMural>(post?.tipo ?? "aniversario");
  const [anos, setAnos] = useState(post?.anos_casa ? String(post.anos_casa) : "");
  const salvar = useMutation({
    mutationFn: () => salvarPost(post?.id ?? null, { titulo, texto, data_post: data, visivel_ate: null, publicar_em: publicarEm, tipo, anos_casa: anos ? Number(anos) : null, arquivo, imagem_path: post?.imagem_path ?? null }),
    onSuccess: () => { toast.success(agendar ? `Post agendado para ${dataBR(data)} às ${horaAgendada}.` : "Post publicado."); qc.invalidateQueries({ queryKey: muralKey }); qc.invalidateQueries({ queryKey: avisosKey }); onClose(); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{post ? "Editar post" : "Novo post no mural"}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><Label htmlFor="mtp">Tipo de comemoração</Label>
              <select id="mtp" className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm" value={tipo} onChange={(e) => setTipo(e.target.value as TipoMural)}>
                <option value="geral">Geral</option><option value="aniversario">Aniversário</option><option value="tempo_casa">Tempo de casa</option>
              </select></div>
            {tipo === "tempo_casa" && <div><Label htmlFor="man">Anos de casa</Label><Input id="man" type="number" min={1} max={80} value={anos} onChange={(e) => setAnos(e.target.value)} /></div>}
          </div>
          <div><Label htmlFor="mt">Título</Label><Input id="mt" maxLength={120} value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Feliz aniversário, Maria!" /></div>
          <div><Label htmlFor="mx">Texto</Label><Textarea id="mx" ref={campoTexto} rows={4} value={texto} onChange={(e) => {
            const v = e.target.value;
            setTexto(v);
            const pos = e.target.selectionStart ?? v.length;
            const q = consultaMencaoAtiva(v.slice(0, pos));
            if (q === null) { setMencao(false); setConsultaMencao(null); }
            else { setMencao(true); setConsultaMencao(q); }
          }} placeholder="Use @ para mencionar pessoas ou departamentos" /><MencaoPicker open={mencao} onOpenChange={(v) => { setMencao(v); if (!v) setConsultaMencao(null); }} consulta={consultaMencao} onSelect={(m) => { setTexto((t) => inserirMencaoEmTexto(t, campoTexto.current, tokenMencao(m))); setConsultaMencao(null); }} /></div>
          <div><Label htmlFor="mi">Imagem (ex.: arte de parabéns)</Label><Input id="mi" type="file" accept="image/*" onChange={(e) => setArquivo(e.target.files?.[0] ?? null)} /></div>
          <div className="space-y-2 rounded-md border p-3">
            <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={agendar} onChange={(e) => setAgendar(e.target.checked)} /> Agendar post</label>
            {agendar && <div className="grid grid-cols-2 gap-3">
              <div><Label htmlFor="mag">Data</Label><Input id="mag" type="date" min={hoje} value={dataAgendada} onChange={(e) => setDataAgendada(e.target.value)} /></div>
              <div><Label htmlFor="mah">Hora</Label><Input id="mah" type="time" value={horaAgendada} onChange={(e) => setHoraAgendada(e.target.value)} /></div>
              {dataInvalida && dataAgendada && <p className="col-span-2 text-xs text-destructive">Escolha uma data e hora futuras.</p>}</div>}
          </div>
          <p className="text-xs text-muted-foreground">O post sai automaticamente no primeiro dia útil do mês seguinte. Aniversários e tempo de casa aparecem em slides separados.</p>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => salvar.mutate()} disabled={!titulo.trim() || !data || dataInvalida || salvar.isPending}>{post ? "Salvar" : agendar ? "Agendar" : "Publicar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
