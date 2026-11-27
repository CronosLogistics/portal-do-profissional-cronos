import { supabase } from "@/integrations/supabase/client";
import type { RelatorioHumor } from "./felizometro.rules";

export type PulsoPendente = { dia: string; pulso: "segunda" | "sexta" | null; pendente: boolean };

export async function consultarPulso(): Promise<PulsoPendente> {
  const { data, error } = await supabase.rpc("felizometro_pendente");
  if (error) throw new Error("Não foi possível consultar o pulso semanal.");
  return data as unknown as PulsoPendente;
}

export async function acessoFelizometro(): Promise<boolean> {
  const { data, error } = await supabase.rpc("pode_ver_felizometro");
  if (error) throw new Error("Não foi possível consultar o acesso ao Felizômetro.");
  return data === true;
}

export async function enviarPulso(sentimento: number, relato: string) {
  if (!Number.isInteger(sentimento) || sentimento < 1 || sentimento > 5) throw new Error("Selecione como está se sentindo.");
  if (relato.length > 1000) throw new Error("O relato deve ter até 1000 caracteres.");
  const { error } = await supabase.rpc("responder_felizometro", { _sentimento: sentimento, _relato: relato.trim() });
  if (error) throw new Error(error.message || "Não foi possível enviar. Tente novamente.");
}

export async function consultarRelatorioHumor(inicio: string, fim: string): Promise<RelatorioHumor> {
  const { data, error } = await supabase.rpc("relatorio_felizometro", { _inicio: inicio, _fim: fim });
  if (error) throw new Error(error.message || "Não foi possível carregar o relatório.");
  return data as unknown as RelatorioHumor;
}