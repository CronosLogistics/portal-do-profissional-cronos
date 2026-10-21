import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Trash2 } from "lucide-react";
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
  description: string;
  description_title: string;
  how_to_join: string;
  how_to_join_title: string;
  rules: string;
  rules_title: string;
  contacts: string;
  contacts_title: string;
  icon: string;
  needs_content: boolean;
  sort_order: number;
  is_active: boolean;
};

const empty: FormState = {
  title: "",
  slug: "",
  summary: "",
  description: "",
  description_title: "Como funciona",
  how_to_join: "",
  how_to_join_title: "Como participar",
  rules: "",
  rules_title: "Regras",
  contacts: "",
  contacts_title: "Contato",
  icon: "Trophy",
  needs_content: false,
  sort_order: 99,
  is_active: true,
};

export const Route = createFileRoute("/_authenticated/admin/recompensa/$id")({
  head: () => ({
    meta: [
      { title: "Cadastro de programa | Espaço do Profissional Cronos" },
      {
        name: "description",
        content: "Formulário interno para cadastrar e editar programas de recompensas.",
      },
      { property: "og:title", content: "Cadastro de programa de recompensas" },
      { property: "og:description", content: "Formulário interno de cadastro de programas." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ProgramForm,
});

function ProgramForm() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const isNewProgram = id === "novo";
  const [form, setForm] = useState<FormState>(empty);
  const [loading, setLoading] = useState(!isNewProgram);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isNewProgram) return;
    void (async () => {
      const { data, error } = await supabase
        .from("reward_programs")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error || !data) {
        toast.error("Programa não encontrado.");
        navigate({ to: "/admin/recompensas", replace: true });
        return;
      }
      setForm({
        title: data.title,
        slug: data.slug,
        summary: data.summary,
        description: data.description,
        description_title: data.description_title || "Como funciona",
        how_to_join: data.how_to_join,
        how_to_join_title: data.how_to_join_title || "Como participar",
        rules: data.rules,
        rules_title: data.rules_title || "Regras",
        contacts: data.contacts,
        contacts_title: data.contacts_title || "Contato",
        icon: data.icon,
        needs_content: data.needs_content,
        sort_order: data.sort_order,
        is_active: data.is_active,
      });
      setLoading(false);
    })();
  }, [id, isNewProgram, navigate]);

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
      description: form.description.trim(),
      description_title: form.description_title.trim(),
      how_to_join: form.how_to_join.trim(),
      how_to_join_title: form.how_to_join_title.trim(),
      rules: form.rules.trim(),
      rules_title: form.rules_title.trim(),
      contacts: form.contacts.trim(),
      contacts_title: form.contacts_title.trim(),
      icon: form.icon,
      needs_content: form.needs_content,
      sort_order: Number(form.sort_order) || 0,
      is_active: form.is_active,
    };

    const { error } = isNewProgram
      ? await supabase.from("reward_programs").insert(payload)
      : await supabase.from("reward_programs").update(payload).eq("id", id);

    setSaving(false);
    if (error) {
      toast.error(
        error.message.includes("duplicate")
          ? "Já existe um programa com este endereço (slug)."
          : "Não foi possível salvar. Verifique suas permissões.",
      );
      return;
    }
    toast.success(isNewProgram ? "Programa cadastrado." : "Alterações salvas.");
    navigate({ to: "/admin/recompensas" });
  }

  async function handleDelete() {
    if (!confirm("Remover este programa definitivamente?")) return;
    const { error } = await supabase.from("reward_programs").delete().eq("id", id);
    if (error) {
      toast.error("Não foi possível remover.");
      return;
    }
    toast.success("Programa removido.");
    navigate({ to: "/admin/recompensas" });
  }

  if (loading) {
    return <p className="p-10 text-sm text-muted-foreground">Carregando...</p>;
  }

  return (
    <div className="min-h-screen">
      <main className="mx-auto max-w-3xl px-4 py-10">
        <Link
          to="/admin/recompensas"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para a lista
        </Link>

        <h1 className="mt-6 font-display text-2xl font-bold">
          {isNewProgram ? "Novo programa" : form.title}
        </h1>

        <form onSubmit={handleSubmit} className="mt-8 grid gap-6">
          <section className="glass-card grid gap-4 rounded-2xl p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="title">Nome do programa</Label>
                <Input
                  id="title"
                  required
                  value={form.title}
                  onChange={(event) => {
                    update("title", event.target.value);
                    if (isNewProgram) update("slug", slugify(event.target.value));
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
              <Label htmlFor="description">Título da seção e texto</Label>
              <Input aria-label="Título da seção" className="font-semibold text-accent" placeholder="Como funciona" value={form.description_title} onChange={(event) => update("description_title", event.target.value)} />
              <Textarea
                id="description"
                rows={5}
                value={form.description}
                onChange={(event) => update("description", event.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="join">Título da seção e texto</Label>
              <Input aria-label="Título da seção" className="font-semibold text-accent" placeholder="Como participar" value={form.how_to_join_title} onChange={(event) => update("how_to_join_title", event.target.value)} />
              <Textarea
                id="join"
                rows={4}
                value={form.how_to_join}
                onChange={(event) => update("how_to_join", event.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="rules">Título da seção e texto</Label>
              <Input aria-label="Título da seção" className="font-semibold text-accent" placeholder="Regras" value={form.rules_title} onChange={(event) => update("rules_title", event.target.value)} />
              <Textarea
                id="rules"
                rows={3}
                value={form.rules}
                onChange={(event) => update("rules", event.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="contacts">Título da seção e texto</Label>
              <Input aria-label="Título da seção" className="font-semibold text-accent" placeholder="Contato" value={form.contacts_title} onChange={(event) => update("contacts_title", event.target.value)} />
              <Textarea
                id="contacts"
                rows={2}
                value={form.contacts}
                onChange={(event) => update("contacts", event.target.value)}
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
              {saving ? "Salvando..." : "Salvar programa"}
            </Button>
            {!isNewProgram ? (
              <Button type="button" variant="ghost" onClick={handleDelete} className="h-11">
                <Trash2 className="mr-1.5 h-4 w-4" />
                Remover
              </Button>
            ) : null}
          </div>
        </form>
      </main>
    </div>
  );
}
