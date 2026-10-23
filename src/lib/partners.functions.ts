import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { CategoryRow } from "@/lib/categories";

export type PublicPartner = {
  id: string;
  slug: string;
  name: string;
  category: string;
  category_name: string;
  category_icon: string;
  summary: string;
  benefit_description: string;
  discount: string;
  how_to_use: string;
  rules: string;
  address: string | null;
  website: string | null;
  instagram: string | null;
  whatsapp: string | null;
  logo_url: string | null;
  is_featured: boolean;
  created_at: string;
  all_offices: boolean;
  office_ids: string[];
};

export type PublicAttachment = {
  id: string;
  name: string;
  file_path: string;
  mime_type: string;
  size_bytes: number;
  url: string;
};

const PUBLIC_COLUMNS =
  "id, slug, name, category_slug, summary, benefit_description, discount, how_to_use, rules, address, website, instagram, whatsapp, logo_url, is_featured, created_at, all_offices, partner_offices(office_id), partner_categories!inner(name, icon, is_active)";


type Row = Record<string, unknown> & {
  category_slug: string | null;
  partner_categories: { name: string; icon: string } | null;
  partner_offices?: { office_id: string }[] | null;
};

function mapPartner(row: Row, fix: (u: string | null) => string | null): PublicPartner {
  const { partner_categories, category_slug, partner_offices, ...rest } = row;
  return {
    ...(rest as unknown as PublicPartner),
    logo_url: fix((rest as { logo_url?: string | null }).logo_url ?? null),
    category: category_slug ?? "",
    category_name: partner_categories?.name ?? "",
    category_icon: partner_categories?.icon ?? "Tag",
    office_ids: (partner_offices ?? []).map((o) => o.office_id),
  };
}

export const listPublicCategories = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const supabase = context.supabase;
  const { data, error } = await supabase
    .from("partner_categories")
    .select("id, slug, name, description, icon, sort_order")
    .eq("is_active", true)
    .order("sort_order")
    .order("name");
  if (error) {
    console.error("Erro ao listar categorias:", error.message);
    return [] as CategoryRow[];
  }
  return (data ?? []) as CategoryRow[];
});

export const listPublicPartners = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const supabase = context.supabase;
  const { data, error } = await supabase
    .from("partners")
    .select(PUBLIC_COLUMNS)
    .eq("is_active", true)
    .eq("partner_categories.is_active", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erro ao listar parceiros:", error.message);
    return [] as PublicPartner[];
  }

  return ((data ?? []) as unknown as Row[]).map((r) => mapPartner(r, (u) => u));
});

export const getPublicPartner = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { slug: string }) => data)
  .handler(async ({ data, context }) => {
    const supabase = context.supabase;
    const { data: partner, error } = await supabase
      .from("partners")
      .select(PUBLIC_COLUMNS.replace("!inner", ""))
      .eq("is_active", true)
      .eq("slug", data.slug)
      .maybeSingle();

    if (error || !partner) {
      if (error) console.error("Erro ao buscar parceiro:", error.message);
      return null;
    }

    const { data: files } = await supabase
      .from("partner_attachments")
      .select("id, name, file_path, mime_type, size_bytes")
      .eq("partner_id", (partner as unknown as { id: string }).id)
      .order("sort_order")
      .order("created_at");
    return {
      ...mapPartner(partner as unknown as Row, (u) => u),
      attachments: ((files ?? []) as Omit<PublicAttachment, "url">[]).map((f) => ({
        ...f,
        url: attachmentUrl(f.file_path, f.name),
      })),
    };
  });

export type PublicOffice = { id: string; slug: string; name: string };

export const listPublicOffices = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("offices")
      .select("id, slug, name")
      .eq("is_active", true)
      .order("sort_order");
    if (error) console.error("Erro ao listar escritórios:", error.message);
    return (data ?? []) as PublicOffice[];
  });

/** Anexos migrados guardam endereço completo; novos ficam no armazenamento do portal. */
export function attachmentUrl(path: string, name: string) {
  if (/^https?:\/\//.test(path)) return path;
  return `/api/public/partner-logo?path=${encodeURIComponent(path)}&name=${encodeURIComponent(name)}`;
}
