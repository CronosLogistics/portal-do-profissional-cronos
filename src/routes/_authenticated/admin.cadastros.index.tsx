import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye, EyeOff, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { AdminTabs } from "@/components/clube/AdminTabs";
import { ContentIcon } from "@/components/clube/ContentIcon";

type Row = {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  sort_order: number;
  is_active: boolean;
  partners: { count: number }[];
};

export const Route = createFileRoute("/_authenticated/admin/cadastros/")({
  head: () => ({
    meta: [
      { title: "Cadastros | Portal do Profissional Cronos" },
      { name: "description", content: "Painel interno para gerenciar as categorias de parceiros." },
      { property: "og:title", content: "Cadastros | Portal do Profissional Cronos" },
      { property: "og:description", content: "Gestão das categorias de parceiros." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Cadastros,
});

function Cadastros() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const { data, error } = await supabase
        .from("partner_categories")
        .select("id, slug, name, description, icon, sort_order, is_active, partners(count)")
        .order("sort_order")
        .order("name");
      if (error) toast.error("Não conseguimos carregar as categorias.");
      setRows((data as unknown as Row[]) ?? []);
      setLoading(false);
    })();
  }, []);

  async function toggle(row: Row) {
    const { error } = await supabase
      .from("partner_categories")
      .update({ is_active: !row.is_active })
      .eq("id", row.id);
    if (error) {
      toast.error("Você não tem permissão para esta alteração.");
      return;
    }
    setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, is_active: !r.is_active } : r)));
  }

  return (
    <div className="min-h-screen">
      <main className="mx-auto max-w-6xl px-4 py-10">
        <p className="text-xs uppercase tracking-widest text-accent">Área restrita</p>
        <h1 className="mb-6 font-display text-xl font-bold">Cadastros</h1>
        <AdminTabs />

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg font-semibold">Categorias de parceiros</h2>
          <Button asChild className="h-11">
            <Link to="/admin/cadastros/categoria/$id" params={{ id: "novo" }}>
              <Plus className="mr-1.5 h-4 w-4" />
              Nova categoria
            </Link>
          </Button>
        </div>

        <div className="mt-6 grid gap-3">
          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : (
            rows.map((row) => {
              const count = row.partners?.[0]?.count ?? 0;
              return (
                <div key={row.id} className="glass-card flex flex-wrap items-center gap-4 rounded-2xl p-4">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent text-primary-foreground">
                    <ContentIcon name={row.icon} className="h-5 w-5" />
                  </span>
                  <div className="min-w-[12rem] flex-1">
                    <p className="font-medium">
                      {row.name}
                      {row.is_active ? null : (
                        <span className="ml-2 text-xs text-muted-foreground">(oculta)</span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {count} parceiro{count === 1 ? "" : "s"} · ordem {row.sort_order}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => toggle(row)} title={row.is_active ? "Publicada" : "Oculta"}>
                    {row.is_active ? <Eye className="h-4 w-4 text-primary" /> : <EyeOff className="h-4 w-4 opacity-50" />}
                  </Button>
                  <Button variant="ghost" size="sm" asChild>
                    <Link to="/admin/cadastros/categoria/$id" params={{ id: row.id }}>
                      <Pencil className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
}
