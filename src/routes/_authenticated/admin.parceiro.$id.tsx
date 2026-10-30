import { criarIdCliente } from "@/lib/client-id";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Trash2, Upload } from "lucide-react";
import { PartnerAttachments } from "@/components/clube/PartnerAttachments";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { PartnerLogo } from "@/components/clube/PartnerLogo";
import { slugify, type CategoryRow } from "@/lib/categories";

type FormState = {
  name: string;
  slug: string;
  category: string;
  summary: string;
  benefit_description: string;
  discount: string;
  how_to_use: string;
  rules: string;
  address: string;
  website: string;
  instagram: string;
  whatsapp: string;
  logo_url: string;
  is_featured: boolean;
  is_active: boolean;
  all_offices: boolean;
  office_ids: string[];
};

const empty: FormState = {
  name: "",
  slug: "",
  category: "gastronomia",
  summary: "",
  benefit_description: "",
  discount: "",
  how_to_use: "",
  rules: "",
  address: "",
  website: "",
  instagram: "",
  whatsapp: "",
  logo_url: "",
  is_featured: false,
  is_active: true,
  all_offices: true,
  office_ids: [],
};

export const Route = createFileRoute("/_authenticated/admin/parceiro/$id")({
  head: () => ({
    meta: [
      { title: "Cadastro de parceiro | Portal do Profissional Cronos" },
      {
        name: "description",
        content: "Formulário interno para cadastrar e editar parcerias do clube de vantagens.",
      },
      { property: "og:title", content: "Cadastro de parceiro | Portal do Profissional Cronos" },
      { property: "og:description", content: "Formulário interno de cadastro de parcerias." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PartnerForm,
});

function PartnerForm() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const isNewPartner = id === "novo";
  const [form, setForm] = useState<FormState>(empty);
  const [loading, setLoading] = useState(!isNewPartner);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const [categoryOptions, setCategoryOptions] = useState<CategoryRow[]>([]);
  const [officeOptions, setOfficeOptions] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    void supabase
      .from("offices")
      .select("id, name")
      .order("sort_order")
      .then(({ data }) => setOfficeOptions(data ?? []));
  }, []);

  useEffect(() => {
    void supabase
      .from("partner_categories")
      .select("slug, name, description, icon, is_active")
      .order("sort_order")
      .then(({ data }) => setCategoryOptions((data as CategoryRow[]) ?? []));
  }, []);

  useEffect(() => {
    if (isNewPartner) return;
    void (async () => {
      const { data, error } = await supabase.from("partners").select("*, partner_offices(office_id)").eq("id", id).maybeSingle();
      if (error || !data) {
        toast.error("Parceiro não encontrado.");
        navigate({ to: "/admin", replace: true });
        return;
      }
      setForm({
        name: data.name,
        slug: data.slug,
        category: data.category_slug ?? data.category,
        summary: data.summary,
        benefit_description: data.benefit_description,
        discount: data.discount,
        how_to_use: data.how_to_use,
        rules: data.rules ?? "",
        address: data.address ?? "",
        website: data.website ?? "",
        instagram: data.instagram ?? "",
        whatsapp: data.whatsapp ?? "",
        logo_url: data.logo_url ?? "",
        is_featured: data.is_featured,
        is_active: data.is_active,
        all_offices: data.all_offices,
        office_ids: (data.partner_offices ?? []).map((o) => o.office_id),
      });
      setLoading(false);
    })();
  }, [id, isNewPartner, navigate]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleUpload(file: File) {
    setUploading(true);
    const ext = file.name.split(".").pop() ?? "png";
    const path = `${form.slug || slugify(form.name) || criarIdCliente()}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("partner-logos").upload(path, file, {
      upsert: true,
      contentType: file.type,
    });
    setUploading(false);
    if (error) {
      toast.error("Não foi possível enviar a imagem.");
      return;
    }
    update("logo_url", `/api/public/partner-logo?path=${encodeURIComponent(path)}`);
    toast.success("Logo enviada.");
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);

    const payload = {
      name: form.name.trim(),
      slug: (form.slug.trim() || slugify(form.name)).toLowerCase(),
      category_slug: form.category,
      summary: form.summary.trim(),
      benefit_description: form.benefit_description.trim(),
      discount: form.discount.trim(),
      how_to_use: form.how_to_use.trim(),
      rules: form.rules.trim(),
      address: form.address.trim() || null,
      website: form.website.trim() || null,
      instagram: form.instagram.trim() || null,
      whatsapp: form.whatsapp.trim() || null,
      logo_url: form.logo_url.trim() || null,
      is_featured: form.is_featured,
      is_active: form.is_active,
      all_offices: form.all_offices,
    };

    const result = isNewPartner
      ? await supabase.from("partners").insert(payload).select("id").single()
      : await supabase.from("partners").update(payload).eq("id", id).select("id").single();
    let error = result.error;
    const partnerId = result.data?.id;
    if (!error && partnerId) {
      const del = await supabase.from("partner_offices").delete().eq("partner_id", partnerId);
      error = del.error;
      if (!error && !form.all_offices && form.office_ids.length > 0) {
        const ins = await supabase
          .from("partner_offices")
          .insert(form.office_ids.map((office_id) => ({ partner_id: partnerId, office_id })));
        error = ins.error;
      }
    }

    setSaving(false);
    if (error) {
      toast.error(
        error.message.includes("duplicate")
          ? "Já existe um parceiro com este endereço (slug)."
          : "Não foi possível salvar. Verifique suas permissões.",
      );
      return;
    }
    toast.success(isNewPartner ? "Parceiro cadastrado." : "Alterações salvas.");
    navigate({ to: "/admin" });
  }

  async function handleDelete() {
    if (!confirm("Remover este parceiro definitivamente?")) return;
    const { error } = await supabase.from("partners").delete().eq("id", id);
    if (error) {
      toast.error("Não foi possível remover.");
      return;
    }
    toast.success("Parceiro removido.");
    navigate({ to: "/admin" });
  }

  if (loading) {
    return <p className="p-10 text-sm text-muted-foreground">Carregando...</p>;
  }

  return (
    <div className="min-h-screen">
      <main className="mx-auto max-w-3xl px-4 py-10">
        <Link
          to="/admin"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para a lista
        </Link>

        <h1 className="mt-6 font-display text-2xl font-bold">
          {isNewPartner ? "Novo parceiro" : form.name}
        </h1>

        <form onSubmit={handleSubmit} className="mt-8 grid gap-6">
          <section className="glass-card grid gap-4 rounded-2xl p-6">
            <div className="flex items-center gap-4">
              <PartnerLogo name={form.name || "Parceiro"} logoUrl={form.logo_url || null} />
              <div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploading}
                  onClick={() => fileInput.current?.click()}
                >
                  <Upload className="mr-1.5 h-4 w-4" />
                  {uploading ? "Enviando..." : "Enviar logo"}
                </Button>
                <p className="mt-2 text-xs text-muted-foreground">
                  PNG ou JPG até 5 MB. Sem logo, mostramos as iniciais do parceiro.
                </p>
              </div>
              <input
                ref={fileInput}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void handleUpload(file);
                }}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="name">Nome do parceiro</Label>
                <Input
                  id="name"
                  required
                  value={form.name}
                  onChange={(event) => {
                    update("name", event.target.value);
                    if (isNewPartner) update("slug", slugify(event.target.value));
                  }}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="category">Categoria</Label>
                <select
                  id="category"
                  value={form.category}
                  onChange={(event) => update("category", event.target.value)}
                  className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                >
                  {categoryOptions.map((category) => (
                    <option key={category.slug} value={category.slug}>
                      {category.name}
                      {category.is_active === false ? " (oculta)" : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="discount">Desconto / condição</Label>
                <Input
                  id="discount"
                  required
                  placeholder="Ex.: 20% de desconto"
                  value={form.discount}
                  onChange={(event) => update("discount", event.target.value)}
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
            </div>

            <div className="grid gap-2">
              <Label htmlFor="summary">Resumo (aparece no card)</Label>
              <Input
                id="summary"
                required
                maxLength={160}
                value={form.summary}
                onChange={(event) => update("summary", event.target.value)}
              />
            </div>
          </section>

          <section className="glass-card grid gap-4 rounded-2xl p-6">
            <div className="grid gap-2">
              <Label htmlFor="benefit">Descrição do benefício</Label>
              <Textarea
                id="benefit"
                required
                rows={4}
                value={form.benefit_description}
                onChange={(event) => update("benefit_description", event.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="how">Como utilizar</Label>
              <Textarea
                id="how"
                required
                rows={3}
                value={form.how_to_use}
                onChange={(event) => update("how_to_use", event.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="rules">Regras e condições (opcional)</Label>
              <Textarea
                id="rules"
                rows={3}
                value={form.rules}
                onChange={(event) => update("rules", event.target.value)}
              />
            </div>
          </section>

          <section className="glass-card grid gap-4 rounded-2xl p-6 sm:grid-cols-2">
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="address">Endereço (opcional)</Label>
              <Input
                id="address"
                value={form.address}
                onChange={(event) => update("address", event.target.value)}
              />
            </div>
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
              <Label htmlFor="instagram">Instagram (opcional)</Label>
              <Input
                id="instagram"
                placeholder="@parceiro"
                value={form.instagram}
                onChange={(event) => update("instagram", event.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="whatsapp">WhatsApp (opcional)</Label>
              <Input
                id="whatsapp"
                placeholder="(11) 99999-0000"
                value={form.whatsapp}
                onChange={(event) => update("whatsapp", event.target.value)}
              />
            </div>
          </section>

          <section className="glass-card grid gap-4 rounded-2xl p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium">Disponível em todos os escritórios</p>
                <p className="text-xs text-muted-foreground">
                  Desative para escolher em quais escritórios o parceiro aparece.
                </p>
              </div>
              <Switch
                checked={form.all_offices}
                onCheckedChange={(value) => update("all_offices", value)}
              />
            </div>
            {form.all_offices ? null : (
              <div className="grid gap-2 sm:grid-cols-3">
                {officeOptions.map((office) => {
                  const checked = form.office_ids.includes(office.id);
                  return (
                    <label
                      key={office.id}
                      className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm ${
                        checked ? "border-primary bg-primary/10" : "border-border"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          update(
                            "office_ids",
                            checked
                              ? form.office_ids.filter((item) => item !== office.id)
                              : [...form.office_ids, office.id],
                          )
                        }
                      />
                      {office.name}
                    </label>
                  );
                })}
              </div>
            )}
          </section>

          <section className="glass-card grid gap-4 rounded-2xl p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium">Publicado no site</p>
                <p className="text-xs text-muted-foreground">
                  Desative para esconder o parceiro dos colaboradores.
                </p>
              </div>
              <Switch
                checked={form.is_active}
                onCheckedChange={(value) => update("is_active", value)}
              />
            </div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium">Destacar como novidade</p>
                <p className="text-xs text-muted-foreground">
                  Aparece na seção “Novas parcerias” da página inicial.
                </p>
              </div>
              <Switch
                checked={form.is_featured}
                onCheckedChange={(value) => update("is_featured", value)}
              />
            </div>
          </section>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={saving} className="h-11">
              {saving ? "Salvando..." : "Salvar parceiro"}
            </Button>
            {!isNewPartner ? (
              <Button type="button" variant="ghost" onClick={handleDelete} className="h-11">
                <Trash2 className="mr-1.5 h-4 w-4" />
                Remover
              </Button>
            ) : null}
          </div>
        </form>

        {isNewPartner ? (
          <p className="glass-card mt-6 rounded-2xl p-6 text-sm text-muted-foreground">
            Salve o parceiro para poder anexar arquivos.
          </p>
        ) : (
          <PartnerAttachments partnerId={id} />
        )}
      </main>
    </div>
  );
}
