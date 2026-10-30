import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye, EyeOff, LogOut, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { AdminTabs } from "@/components/clube/AdminTabs";
import { ContentIcon } from "@/components/clube/ContentIcon";

type AdminBenefit = {
  id: string;
  title: string;
  slug: string;
  icon: string;
  summary: string;
  sort_order: number;
  is_active: boolean;
  needs_content: boolean;
};

export const Route = createFileRoute("/_authenticated/admin/beneficios")({
  head: () => ({
    meta: [
      { title: "Gestão de benefícios | Portal do Profissional Cronos" },
      {
        name: "description",
        content: "Painel interno para cadastrar e editar os benefícios dos profissionais.",
      },
      { property: "og:title", content: "Gestão de benefícios" },
      { property: "og:description", content: "Painel interno de gestão dos benefícios." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminBenefits,
});

function AdminBenefits() {
  const navigate = useNavigate();
  const [items, setItems] = useState<AdminBenefit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const { data, error } = await supabase
        .from("benefits")
        .select("id, title, slug, icon, summary, sort_order, is_active, needs_content")
        .order("sort_order");
      if (error) toast.error("Não conseguimos carregar os benefícios.");
      setItems((data as AdminBenefit[]) ?? []);
      setLoading(false);
    })();
  }, []);

  async function toggleActive(item: AdminBenefit) {
    const { error } = await supabase
      .from("benefits")
      .update({ is_active: !item.is_active })
      .eq("id", item.id);
    if (error) {
      toast.error("Você não tem permissão para esta alteração.");
      return;
    }
    setItems((prev) =>
      prev.map((row) => (row.id === item.id ? { ...row, is_active: !row.is_active } : row)),
    );
  }

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-border/60">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-5">
          <div>
            <p className="text-xs uppercase tracking-widest text-accent">Área restrita</p>
            <h1 className="font-display text-xl font-bold">Gestão de benefícios</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild><Link to="/beneficios">Voltar ao portal</Link></Button>
            <Button size="sm" onClick={() => toast.success("Informações salvas.")}>Salvar</Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-10">
        <AdminTabs />

        <div className="mt-8 flex justify-end">
          <Button asChild className="h-11">
            <Link to="/admin/beneficio/$id" params={{ id: "novo" }}>
              <Plus className="mr-1.5 h-4 w-4" />
              Novo benefício
            </Link>
          </Button>
        </div>

        <div className="mt-6 grid gap-3">
          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum benefício cadastrado ainda.</p>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="glass-card flex flex-wrap items-center gap-4 rounded-2xl p-4"
              >
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent text-primary-foreground">
                  <ContentIcon name={item.icon} className="h-5 w-5" />
                </span>
                <div className="min-w-[12rem] flex-1">
                  <p className="font-medium">{item.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.needs_content ? "A preencher · " : ""}
                    {item.summary || item.slug}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleActive(item)}
                    title={item.is_active ? "Publicado" : "Oculto"}
                  >
                    {item.is_active ? (
                      <Eye className="h-4 w-4 text-primary" />
                    ) : (
                      <EyeOff className="h-4 w-4 opacity-50" />
                    )}
                  </Button>
                  <Button variant="ghost" size="sm" asChild>
                    <Link to="/admin/beneficio/$id" params={{ id: item.id }}>
                      <Pencil className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
