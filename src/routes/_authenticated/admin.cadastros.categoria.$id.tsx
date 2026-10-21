import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ContentIcon, iconNames } from "@/components/clube/ContentIcon";
import { slugify } from "@/lib/categories";

type Form = {
  name: string;
  slug: string;
  description: string;
  icon: string;
  sort_order: number;
  is_active: boolean;
};

const empty: Form = { name: "", slug: "", description: "", icon: "Tag", sort_order: 10, is_active: true };

export const Route = createFileRoute("/_authenticated/admin/cadastros/categoria/$id")({
  head: () => ({
    meta: [
      { title: "Categoria de parceiros | Portal do Profissional Cronos" },
      { name: "description", content: "Formulário interno para criar e editar categorias de parceiros." },
      { property: "og:title", content: "Categoria de parceiros | Portal do Profissional Cronos" },
      { property: "og:description", content: "Cadastro de categorias de parceiros." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CategoryForm,
});

function CategoryForm() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const isNew = id === "novo";
  const [form, setForm] = useState<Form>(empty);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isNew) return;
    void (async () => {
      const { data } = await supabase.from("partner_categories").select("*").eq("id", id).maybeSingle();
      if (!data) {
        toast.error("Categoria não encontrada.");
        navigate({ to: "/admin/cadastros", replace: true });
        return;
      }
      setForm({
        name: data.name,
        slug: data.slug,
        description: data.description,
        icon: data.icon,
        sort_order: data.sort_order,
        is_active: data.is_active,
      });
      setLoading(false);
    })();
  }, [id, isNew, navigate]);

  function update<K extends keyof Form>(key: K, value: Form[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      slug: form.slug.trim() || slugify(form.name),
      description: form.description.trim(),
      icon: form.icon,
      sort_order: Number(form.sort_order) || 0,
      is_active: form.is_active,
    };
    const { error } = isNew
      ? await supabase.from("partner_categories").insert(payload)
      : await supabase.from("partner_categories").update(payload).eq("id", id);
    setSaving(false);
    if (error) {
      toast.error(
        error.message.includes("duplicate")
          ? "Já existe uma categoria com este endereço."
          : "Não foi possível salvar. Verifique suas permissões.",
      );
      return;
    }
    toast.success(isNew ? "Categoria criada." : "Alterações salvas.");
    navigate({ to: "/admin/cadastros" });
  }

  async function remove() {
    const { count } = await supabase
      .from("partners")
      .select("id", { count: "exact", head: true })
      .eq("category_slug", form.slug);
    if ((count ?? 0) > 0) {
      toast.error("Esta categoria tem parceiros. Mude-os de categoria ou apenas oculte-a.");
      return;
    }
    if (!confirm("Excluir esta categoria definitivamente?")) return;
    const { error } = await supabase.from("partner_categories").delete().eq("id", id);
    if (error) {
      toast.error("Não foi possível excluir.");
      return;
    }
    toast.success("Categoria excluída.");
    navigate({ to: "/admin/cadastros" });
  }

  if (loading) return <p className="p-10 text-sm text-muted-foreground">Carregando...</p>;

  return (
    <div className="min-h-screen">
      <main className="mx-auto max-w-3xl px-4 py-10">
        <Link to="/admin/cadastros" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Voltar para cadastros
        </Link>
        <h1 className="mt-6 font-display text-2xl font-bold">{isNew ? "Nova categoria" : form.name}</h1>

        <form onSubmit={submit} className="glass-card mt-8 grid gap-5 rounded-2xl p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                required
                value={form.name}
                onChange={(event) => {
                  update("name", event.target.value);
                  if (isNew) update("slug", slugify(event.target.value));
                }}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="slug">Endereço da página</Label>
              <Input id="slug" required value={form.slug} onChange={(event) => update("slug", slugify(event.target.value))} />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description">Descrição</Label>
            <Input id="description" value={form.description} onChange={(event) => update("description", event.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Ícone</Label>
            <div className="flex flex-wrap gap-2">
              {iconNames.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => update("icon", name)}
                  title={name}
                  className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border transition-colors ${
                    form.icon === name ? "border-primary bg-primary/20" : "border-border hover:border-primary/60"
                  }`}
                >
                  <ContentIcon name={name} className="h-5 w-5" />
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="order">Ordem de exibição</Label>
              <Input id="order" type="number" value={form.sort_order} onChange={(event) => update("sort_order", Number(event.target.value))} />
            </div>
            <label className="flex items-center gap-3 pt-6 text-sm">
              <Switch checked={form.is_active} onCheckedChange={(value) => update("is_active", value)} />
              Publicada no site
            </label>
          </div>
          <div className="flex flex-wrap justify-between gap-3">
            {isNew ? <span /> : (
              <Button type="button" variant="ghost" onClick={remove}>
                <Trash2 className="mr-1.5 h-4 w-4" />
                Excluir
              </Button>
            )}
            <Button type="submit" disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
          </div>
        </form>
      </main>
    </div>
  );
}
