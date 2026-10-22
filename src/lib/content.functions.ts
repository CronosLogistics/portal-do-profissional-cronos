import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type Benefit = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  intro: string;
  values_info: string;
  how_to_use: string;
  rules: string;
  website: string | null;
  materials_url: string | null;
  contacts: string;
  icon: string;
  needs_content: boolean;
  sort_order: number;
  intro_title: string;
  values_title: string;
  how_to_use_title: string;
  rules_title: string;
  contacts_title: string;
};

export type BenefitImage = {
  id: string;
  year: string;
  caption: string;
  image_url: string | null;
  sort_order: number;
};

export type RewardProgram = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  description: string;
  how_to_join: string;
  rules: string;
  contacts: string;
  icon: string;
  needs_content: boolean;
  sort_order: number;
  description_title: string;
  how_to_join_title: string;
  rules_title: string;
  contacts_title: string;
};

const BENEFIT_COLUMNS =
  "id, slug, title, summary, intro, values_info, how_to_use, rules, website, materials_url, contacts, icon, needs_content, sort_order, intro_title, values_title, how_to_use_title, rules_title, contacts_title";
const PROGRAM_COLUMNS =
  "id, slug, title, summary, description, how_to_join, rules, contacts, icon, needs_content, sort_order, description_title, how_to_join_title, rules_title, contacts_title";


export const listBenefits = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth]).handler(async () => {
  const { legacyClient } = await import("@/lib/legacy-content.server");
  const supabase = legacyClient();
  const { data, error } = await supabase
    .from("benefits")
    .select(BENEFIT_COLUMNS)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Erro ao listar benefícios:", error.message);
    return [] as Benefit[];
  }
  return (data ?? []) as Benefit[];
});

export const getBenefit = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { slug: string }) => data)
  .handler(async ({ data }) => {
    const { legacyClient } = await import("@/lib/legacy-content.server");
    const supabase = legacyClient();
    const { data: benefit, error } = await supabase
      .from("benefits")
      .select(BENEFIT_COLUMNS)
      .eq("is_active", true)
      .eq("slug", data.slug)
      .maybeSingle();

    if (error || !benefit) {
      if (error) console.error("Erro ao buscar benefício:", error.message);
      return null;
    }

    const { data: images } = await supabase
      .from("benefit_images")
      .select("id, year, caption, image_url, sort_order")
      .eq("benefit_id", (benefit as { id: string }).id)
      .order("sort_order", { ascending: true });

    return {
      benefit: benefit as Benefit,
      images: await (async () => {
        const { legacyUrl } = await import("@/lib/legacy-content.server");
        return ((images ?? []) as BenefitImage[]).map((i) => ({ ...i, image_url: legacyUrl(i.image_url) }));
      })(),
    };
  });

export const listRewardPrograms = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth]).handler(async () => {
  const { legacyClient } = await import("@/lib/legacy-content.server");
  const supabase = legacyClient();
  const { data, error } = await supabase
    .from("reward_programs")
    .select(PROGRAM_COLUMNS)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Erro ao listar programas:", error.message);
    return [] as RewardProgram[];
  }
  return (data ?? []) as RewardProgram[];
});

export const getRewardProgram = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { slug: string }) => data)
  .handler(async ({ data }) => {
    const { legacyClient } = await import("@/lib/legacy-content.server");
    const supabase = legacyClient();
    const { data: program, error } = await supabase
      .from("reward_programs")
      .select(PROGRAM_COLUMNS)
      .eq("is_active", true)
      .eq("slug", data.slug)
      .maybeSingle();

    if (error) console.error("Erro ao buscar programa:", error.message);
    return (program ?? null) as RewardProgram | null;
  });

export const getSiteContent = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth]).handler(async () => {
  const { legacyClient } = await import("@/lib/legacy-content.server");
  const supabase = legacyClient();
  const { data, error } = await supabase.from("site_content").select("key, value");
  if (error) console.error("Erro ao buscar textos:", error.message);
  const map: Record<string, string> = {};
  for (const row of data ?? []) map[row.key] = row.value;
  return map;
});
