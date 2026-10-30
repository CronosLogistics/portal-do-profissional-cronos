import { supabase } from "@/integrations/supabase/client";
import type { Formulario } from "@/lib/formularios";

export const formulariosKey = ["formularios"] as const;
export async function listarFormularios(): Promise<Formulario[]> {
  const { data, error } = await supabase.from("formularios").select("id,setor,titulo,codigo,descricao,acao,url,ordem").order("ordem").order("titulo");
  if (error) throw error;
  return data;
}
export async function salvarFormulario(dados: Omit<Formulario, "id" | "ordem">, id?: string) {
  const query = id ? supabase.from("formularios").update(dados).eq("id", id) : supabase.from("formularios").insert(dados);
  const { data, error } = await query.select("id").single();
  if (error) throw error;
  return data;
}