import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Plus, Trash2, Upload, ArrowDown, ArrowUp } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { IconPicker } from "@/components/clube/IconPicker";
import { slugify } from "@/lib/categories";

type FormState = {
  title: string;
  slug: string;
  summary: string;
  intro: string;
  intro_title: string;
  values_info: string;
  values_title: string;
  how_to_use: string;
  how_to_use_title: string;
  rules: string;
  rules_title: string;
  website: string;
  materials_url: string;
  contacts: string;
  contacts_title: string;
  icon: string;
  needs_content: boolean;
  sort_order: number;
  is_active: boolean;
};

type ImageRow = {
  id: string;
  year: string;
  caption: string;
  image_url: string | null;
  sort_order: number;
};

const empty: FormState = {
  title: "",
  slug: "",
  summary: "",
  intro: "",
  intro_title: "Sobre o benefício",
  values_info: "",
  values_title: "Valores",
  how_to_use: "",
  how_to_use_title: "Como utilizar",
  rules: "",
  rules_title: "Regras e condições",
  website: "",
  materials_url: "",
  contacts: "",
  contacts_title: "Canais de contato",
  icon: "Gift",
  needs_content: false,
  sort_order: 99,
  is_active: true,
};

export const Route = createFileRoute("/_authenticated/admin/beneficio/$id")({
  head: () => ({
    meta: [
      { title: "Cadastro de benefício | Portal do Profissional Cronos" },
      {
        name: "description",
        content: "Formulário interno para cadastrar e editar benefícios dos profissionais.",
      },
      { property: "og:title", content: "Cadastro de benefício" },
      { property: "og:description", content: "Formulário interno de cadastro de benefícios." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: BenefitForm,
});

function BenefitForm() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const isNewBenefit = id === "novo";
  const [form, setForm] = useState<FormState>(empty);
  const [images, setImages] = useState<ImageRow[]>([]);
  const [loading, setLoading] = useState(!isNewBenefit);
  const [saving, setSaving] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const targetImage = useRef<string | null>(null);

  useEffect(() => {
    if (isNewBenefit) return;
    void (async () => {
      const { data, error } = await supabase
        .from("benefits")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error || !data) {
        toast.error("Benefício não encontrado.");
        navigate({ to: "/admin/beneficios", replace: true });
        return;
      }
      setForm({
        title: data.title,
        slug: data.slug,
        summary: data.summary,
        intro: data.intro,
        intro_title: data.intro_title || "Sobre o benefício",
        values_info: data.values_info,
        values_title: data.values_title || "Valores",
        how_to_use: data.how_to_use,
        how_to_use_title: data.how_to_use_title || "Como utilizar",
        rules: data.rules,
        rules_title: data.rules_title || "Regras e condições",
        website: data.website ?? "",
        materials_url: data.materials_url ?? "",
        contacts: data.contacts,
        contacts_title: data.contacts_title || "Canais de contato",
        icon: data.icon,
        needs_content: data.needs_content,
        sort_order: data.sort_order,
        is_active: data.is_active,
      });
      const { data: imageRows } = await supabase
        .from("benefit_images")
        .select("id, year, caption, image_url, sort_order")
        .eq("benefit_id", id)
        .order("sort_order");
      setImages((imageRows as ImageRow[]) ?? []);
      setLoading(false);
    })();
  }, [id, isNewBenefit, navigate]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);

    const payload = {
      title: form.title.trim(),
      slug: (form.slug.trim() || slugify(form.title)).toLowerCase(),
      summary: form.summary.trim(),
      intro: form.intro.trim(),
      intro_title: form.intro_title.trim(),
      values_info: form.values_info.trim(),
      values_title: form.values_title.trim(),
      how_to_use: form.how_to_use.trim(),
      how_to_use_title: form.how_to_use_title.trim(),
      rules: form.rules.trim(),
      rules_title: form.rules_title.trim(),
      website: form.website.trim() || null,
      materials_url: form.materials_url.trim() || null,
      contacts: form.contacts.trim(),
      contacts_title: form.contacts_title.trim(),
      icon: form.icon,
      needs_content: form.needs_content,
      sort_order: Number(form.sort_order) || 0,
      is_active: form.is_active,
    };

    const { error } = isNewBenefit
      ? await supabase.from("benefits").insert(payload)
      : await supabase.from("benefits").update(payload).eq("id", id);

    setSaving(false);
    if (error) {
      toast.error(
        error.message.includes("duplicate")
          ? "Já existe um benefício com este endereço (slug)."
          : "Não foi possível salvar. Verifique suas permissões.",
      );
      return;
    }
    toast.success(isNewBenefit ? "Benefício cadastrado." : "Alterações salvas.");
    navigate({ to: "/admin/beneficios" });
  }

  async function handleDelete() {
    if (!confirm("Remover este benefício definitivamente?")) return;
    const { error } = await supabase.from("benefits").delete().eq("id", id);
    if (error) {
      toast.error("Não foi possível remover.");
      return;
    }
    toast.success("Benefício removido.");
    navigate({ to: "/admin/beneficios" });
  }

  async function addImage() {
    const { data, error } = await supabase
      .from("benefit_images")
      .insert({ benefit_id: id, year: "", caption: "", sort_order: images.length })
      .select("id, year, caption, image_url, sort_order")
      .single();
    if (error || !data) {
      toast.error("Não foi possível adicionar a foto.");
      return;
    }
    setImages((prev) => [...prev, data as ImageRow]);
  }

  async function saveImage(image: ImageRow) {
    const { error } = await supabase
      .from("benefit_images")
      .update({ year: image.year, caption: image.caption, image_url: image.image_url })
      .eq("id", image.id);
    if (error) toast.error("Não foi possível salvar a foto.");
    else toast.success("Foto salva.");
  }

  async function moveImage(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= images.length) return;
    const next = [...images];
    const a = next[index]!;
    next[index] = next[target]!;
    next[target] = a;
    const ordered = next.map((row, i) => ({ ...row, sort_order: i }));
    setImages(ordered);
    const results = await Promise.all(
      ordered.map((row) =>
        supabase.from("benefit_images").update({ sort_order: row.sort_order }).eq("id", row.id),
      ),
    );
    if (results.some((r) => r.error)) toast.error("Não foi possível reordenar as fotos.");
  }

  async function removeImage(imageId: string) {
    const { error } = await supabase.from("benefit_images").delete().eq("id", imageId);
    if (error) {
      toast.error("Não foi possível remover a foto.");
      return;
    }
    setImages((prev) => prev.filter((row) => row.id !== imageId));
  }

  async function uploadFile(file: File) {
    const imageId = targetImage.current;
    if (!imageId) return;
    setUploadingId(imageId);
    const ext = file.name.split(".").pop() ?? "png";
    const path = `brindes/${imageId}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("partner-logos").upload(path, file, {
      upsert: true,
      contentType: file.type,
    });
    setUploadingId(null);
    if (error) {
      toast.error("Não foi possível enviar a imagem.");
      return;
    }
    const url = `/api/public/partner-logo?path=${encodeURIComponent(path)}`;
    setImages((prev) =>
      prev.map((row) => (row.id === imageId ? { ...row, image_url: url } : row)),
    );
    await supabase.from("benefit_images").update({ image_url: url }).eq("id", imageId);
    toast.success("Foto enviada.");
  }

  if (loading) {
    return <p className="p-10 text-sm text-muted-foreground">Carregando...</p>;
  }

  return (
    <div className="min-h-screen">
      <main className="mx-auto max-w-3xl px-4 py-10">
        <Link
          to="/admin/beneficios"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para a lista
        </Link>

        <h1 className="mt-6 font-display text-2xl font-bold">
          {isNewBenefit ? "Novo benefício" : form.title}
        </h1>

        <form onSubmit={handleSubmit} className="mt-8 grid gap-6">
          <section className="glass-card grid gap-4 rounded-2xl p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="title">Nome do benefício</Label>
                <Input
                  id="title"
                  required
                  value={form.title}
                  onChange={(event) => {
                    update("title", event.target.value);
                    if (isNewBenefit) update("slug", slugify(event.target.value));
                  }}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="slug">Endereço da página</Label>
                <Input
                  id="slug"
                  required
                  value={form.slug}
                  onChange={(event) => update("slug", slugify(event.target.value))}
                />
              </div>
              <div className="grid gap-2 sm:col-span-2">
                <Label>Ícone</Label>
                <IconPicker value={form.icon} title={form.title} onChange={(name) => update("icon", name)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="order">Ordem de exibição</Label>
                <Input
                  id="order"
                  type="number"
                  value={form.sort_order}
                  onChange={(event) => update("sort_order", Number(event.target.value))}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="summary">Resumo (aparece no card)</Label>
              <Input
                id="summary"
                maxLength={180}
                value={form.summary}
                onChange={(event) => update("summary", event.target.value)}
              />
            </div>
          </section>

          <section className="glass-card grid gap-4 rounded-2xl p-6">
            <div className="grid gap-2">
              <Label htmlFor="intro">Título da seção e texto</Label>
              <Input aria-label="Título da seção" className="font-semibold text-accent" placeholder="Sobre o benefício" value={form.intro_title} onChange={(event) => update("intro_title", event.target.value)} />
              <Textarea
                id="intro"
                rows={5}
                value={form.intro}
                onChange={(event) => update("intro", event.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="values">Título da seção e texto</Label>
              <Input aria-label="Título da seção" className="font-semibold text-accent" placeholder="Valores" value={form.values_title} onChange={(event) => update("values_title", event.target.value)} />
              <Textarea
                id="values"
                rows={3}
                value={form.values_info}
                onChange={(event) => update("values_info", event.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="how">Título da seção e texto</Label>
              <Input aria-label="Título da seção" className="font-semibold text-accent" placeholder="Como utilizar" value={form.how_to_use_title} onChange={(event) => update("how_to_use_title", event.target.value)} />
              <Textarea
                id="how"
                rows={4}
                value={form.how_to_use}
                onChange={(event) => update("how_to_use", event.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="rules">Título da seção e texto</Label>
              <Input aria-label="Título da seção" className="font-semibold text-accent" placeholder="Regras e condições" value={form.rules_title} onChange={(event) => update("rules_title", event.target.value)} />
              <Textarea
                id="rules"
                rows={3}
                value={form.rules}
                onChange={(event) => update("rules", event.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="contacts">Título da seção e texto</Label>
              <Input aria-label="Título da seção" className="font-semibold text-accent" placeholder="Canais de contato" value={form.contacts_title} onChange={(event) => update("contacts_title", event.target.value)} />
              <Textarea
                id="contacts"
                rows={3}
                value={form.contacts}
                onChange={(event) => update("contacts", event.target.value)}
              />
            </div>
          </section>

          <section className="glass-card grid gap-4 rounded-2xl p-6 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="website">Site (opcional)</Label>
              <Input
                id="website"
                placeholder="https://"
                value={form.website}
                onChange={(event) => update("website", event.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="materials">Materiais / passo a passo (opcional)</Label>
              <Input
                id="materials"
                placeholder="https://"
                value={form.materials_url}
                onChange={(event) => update("materials_url", event.target.value)}
              />
            </div>
          </section>

          <section className="glass-card grid gap-4 rounded-2xl p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium">Publicado no site</p>
                <p className="text-xs text-muted-foreground">
                  Desative para esconder dos colaboradores.
                </p>
              </div>
              <Switch
                checked={form.is_active}
                onCheckedChange={(value) => update("is_active", value)}
              />
            </div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium">Marcar como “a preencher”</p>
                <p className="text-xs text-muted-foreground">
                  Mostra um aviso de conteúdo em preenchimento na página.
                </p>
              </div>
              <Switch
                checked={form.needs_content}
                onCheckedChange={(value) => update("needs_content", value)}
              />
            </div>
          </section>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={saving} className="h-11">
              {saving ? "Salvando..." : "Salvar benefício"}
            </Button>
            {!isNewBenefit ? (
              <Button type="button" variant="ghost" onClick={handleDelete} className="h-11">
                <Trash2 className="mr-1.5 h-4 w-4" />
                Remover
              </Button>
            ) : null}
          </div>
        </form>

        {!isNewBenefit ? (
          <section className="glass-card mt-8 grid gap-4 rounded-2xl p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-base font-semibold">Fotos (brindes por ano)</h2>
                <p className="text-xs text-muted-foreground">
                  Use apenas nos benefícios que têm imagens, como o brinde por tempo de empresa.
                </p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addImage}>
                <Plus className="mr-1.5 h-4 w-4" />
                Adicionar
              </Button>
            </div>

            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void uploadFile(file);
                event.target.value = "";
              }}
            />

            {images.map((image, index) => (
              <div key={image.id} className="grid gap-3 rounded-xl border border-border/70 p-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor={`year-${image.id}`}>Ano</Label>
                    <Input
                      id={`year-${image.id}`}
                      value={image.year}
                      onChange={(event) =>
                        setImages((prev) =>
                          prev.map((row, i) =>
                            i === index ? { ...row, year: event.target.value } : row,
                          ),
                        )
                      }
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor={`caption-${image.id}`}>Brinde</Label>
                    <Input
                      id={`caption-${image.id}`}
                      value={image.caption}
                      onChange={(event) =>
                        setImages((prev) =>
                          prev.map((row, i) =>
                            i === index ? { ...row, caption: event.target.value } : row,
                          ),
                        )
                      }
                    />
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  {image.image_url ? (
                    <img
                      src={image.image_url}
                      alt={image.caption || "Brinde"}
                      className="h-16 w-16 rounded-lg object-cover"
                    />
                  ) : null}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={uploadingId === image.id}
                    onClick={() => {
                      targetImage.current = image.id;
                      fileInput.current?.click();
                    }}
                  >
                    <Upload className="mr-1.5 h-4 w-4" />
                    {uploadingId === image.id ? "Enviando..." : "Enviar foto"}
                  </Button>
                  <Button type="button" variant="outline" size="sm" disabled={index === 0} onClick={() => moveImage(index, -1)} aria-label="Mover para cima">
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button type="button" variant="outline" size="sm" disabled={index === images.length - 1} onClick={() => moveImage(index, 1)} aria-label="Mover para baixo">
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button type="button" size="sm" onClick={() => saveImage(image)}>
                    Salvar
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeImage(image.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </section>
        ) : null}
      </main>
    </div>
  );
}
