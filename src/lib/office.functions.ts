import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { normalizarEscritorio } from "./office.rules";
export const meuEscritorio = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { data: profile } = await context.supabase.from("profiles").select("email,is_active").eq("id",context.userId).maybeSingle();
  if (!profile?.email || !profile.is_active) return null;
  const { buscarEscritorio } = await import("./office.server");
  const nome = await buscarEscritorio(profile.email);
  if (!nome) return null;
  const { data: offices, error } = await context.supabase.from("offices").select("id,slug,name").eq("is_active",true);
  if (error) throw new Error("Não foi possível carregar o escritório.");
  return offices?.find(o => normalizarEscritorio(o.name) === normalizarEscritorio(nome) || normalizarEscritorio(o.slug) === normalizarEscritorio(nome)) ?? null;
});