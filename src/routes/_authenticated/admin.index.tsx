import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye, EyeOff, LogOut, Pencil, Plus, Star } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PartnerLogo } from "@/components/clube/PartnerLogo";
import { AdminTabs } from "@/components/clube/AdminTabs";


type AdminPartner = {
  id: string;
  slug: string;
  name: string;
  category_slug: string | null;
  partner_categories: { name: string } | null;
  discount: string;
  is_active: boolean;
  is_featured: boolean;
  logo_url: string | null;
};

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({
    meta: [
      { title: "Gestão de parcerias | Portal do Profissional Cronos" },
      {
        name: "description",
        content: "Painel interno para cadastrar, editar e publicar as parcerias do clube.",
      },
      { property: "og:title", content: "Gestão de parcerias | Portal do Profissional Cronos" },
      { property: "og:description", content: "Painel interno de gestão das parcerias." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminHome,
});

function AdminHome() {
  const navigate = useNavigate();
  const [partners, setPartners] = useState<AdminPartner[]>([]);
  const [loading, setLoading] = useState(true);
  const [canEdit, setCanEdit] = useState<boolean | null>(null);
  const [query, setQuery] = useState("");

  async function load() {
    const { data: allowed } = await supabase.rpc("tem_permissao", { _permissao: "conteudo.editar" });
    setCanEdit(allowed === true);
    const { data, error } = await supabase
      .from("partners")
      .select("id, slug, name, category_slug, discount, is_active, is_featured, logo_url, partner_categories(name)")
      .order("name");
    if (error) toast.error("Não conseguimos carregar a lista de parceiros.");
    setPartners((data as unknown as AdminPartner[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  async function toggle(partner: AdminPartner, field: "is_active" | "is_featured") {
    const patch =
      field === "is_active"
        ? { is_active: !partner.is_active }
        : { is_featured: !partner.is_featured };
    const { error } = await supabase.from("partners").update(patch).eq("id", partner.id);
    if (error) {
      toast.error("Você não tem permissão para esta alteração.");
      return;
    }
    setPartners((prev) =>
      prev.map((item) => (item.id === partner.id ? { ...item, [field]: !partner[field] } : item)),
    );
  }

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const filtered = partners.filter((partner) =>
    partner.name.toLowerCase().includes(query.trim().toLowerCase()),
  );

  return (
    <div className="min-h-screen">
      <header className="border-b border-border/60">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-5">
          <div>
            <p className="text-xs uppercase tracking-widest text-accent">Área restrita</p>
            <h1 className="font-display text-xl font-bold">Gestão de parcerias</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild><Link to="/">Voltar ao portal</Link></Button>
            <Button size="sm" onClick={() => toast.success("Informações salvas.")}>Salvar</Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-10">
        {canEdit === false ? (
          <div className="glass-card mb-8 rounded-2xl border-accent/40 p-6 text-sm text-muted-foreground">
            Seu acesso ainda não tem permissão de edição. Peça a um administrador para liberar seu
            usuário.
          </div>
        ) : null}

        <AdminTabs />

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar parceiro..."
            className="h-11 max-w-xs"
          />
          <Button asChild className="h-11">
            <Link to="/admin/parceiro/$id" params={{ id: "novo" }}>
              <Plus className="mr-1.5 h-4 w-4" />
              Novo parceiro
            </Link>
          </Button>
        </div>

        <div className="mt-8 grid gap-3">
          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum parceiro cadastrado ainda.</p>
          ) : (
            filtered.map((partner) => {
              return (
                <div
                  key={partner.id}
                  className="glass-card flex flex-wrap items-center gap-4 rounded-2xl p-4"
                >
                  <PartnerLogo name={partner.name} logoUrl={partner.logo_url} size="sm" />
                  <div className="min-w-[12rem] flex-1">
                    <p className="font-medium">{partner.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {partner.partner_categories?.name ?? "Sem categoria"} ·{" "}
                      {partner.discount}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggle(partner, "is_featured")}
                      title="Destacar parceiro"
                    >
                      <Star
                        className={
                          partner.is_featured ? "h-4 w-4 text-accent" : "h-4 w-4 opacity-50"
                        }
                      />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggle(partner, "is_active")}
                      title={partner.is_active ? "Publicado" : "Oculto"}
                    >
                      {partner.is_active ? (
                        <Eye className="h-4 w-4 text-primary" />
                      ) : (
                        <EyeOff className="h-4 w-4 opacity-50" />
                      )}
                    </Button>
                    <Button variant="ghost" size="sm" asChild>
                      <Link to="/admin/parceiro/$id" params={{ id: partner.id }}>
                        <Pencil className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <p className="mt-10 text-xs text-muted-foreground">
          Para criar ou editar categorias, use a aba Cadastros.
        </p>
      </main>
    </div>
  );
}
