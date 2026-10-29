import { z } from "zod";

export const mesSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
const caminho = z.string().max(250).regex(/^(|[a-f0-9-]{36}\/[a-f0-9-]{36}\.(jpg|jpeg|png|webp))$/);
export const pessoaInsiderSchema = z.object({ id: z.string().max(80), nome: z.string().min(1).max(200), departamento: z.string().max(200), escritorio: z.string().max(100), dia: z.number().int().min(1).max(31), anos: z.number().int().min(1).max(100).optional(), foto: caminho });
export const conteudoInsiderSchema = z.object({
  abertura: z.string().max(20000), antesEventos: z.string().max(10000), antesAniversarios: z.string().max(10000), antesTempoCasa: z.string().max(10000), encerramento: z.string().max(10000), bannerMes: caminho,
  eventos: z.array(z.object({ id: z.string().max(80), titulo: z.string().max(200), data: z.string().max(100), descricao: z.string().max(5000), imagem: caminho })).max(30),
  aniversariantes: z.array(pessoaInsiderSchema).max(1000), tempoCasa: z.array(pessoaInsiderSchema).max(1000),
});
export type ConteudoInsider = z.infer<typeof conteudoInsiderSchema>;
export type PessoaInsider = z.infer<typeof pessoaInsiderSchema>;
export type ProfissionalInsider = { id: string; fields: { Title?: string; field_1?: string; field_4?: string; DATADENASC_x002e_?: string; DEPARTAMENTOATUAL?: string; field_3?: string } };

export function mesBrasilia(agora = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit" }).formatToParts(agora);
  return `${parts.find(p => p.type === "year")?.value}-${parts.find(p => p.type === "month")?.value}`;
}
export function primeiroDiaUtil(mes: string) {
  mesSchema.parse(mes);
  const dia = new Date(`${mes}-01T12:00:00Z`).getUTCDay();
  return dia === 6 ? 3 : dia === 0 ? 2 : 1;
}
export function devePrepararHoje(agora = new Date()) {
  const dia = Number(new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", day: "2-digit" }).format(agora));
  return dia === primeiroDiaUtil(mesBrasilia(agora));
}
export function nomeMes(mes: string) {
  return new Date(`${mesSchema.parse(mes)}-01T12:00:00Z`).toLocaleDateString("pt-BR", { month: "long", year: "numeric", timeZone: "America/Sao_Paulo" });
}
function dataCivil(valor?: string) {
  if (!valor || !/^\d{4}-\d{2}-\d{2}/.test(valor)) return null;
  const dia = new Date(valor.length === 10 ? `${valor}T12:00:00Z` : valor);
  if (Number.isNaN(dia.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(dia);
  return { ano: Number(parts.find(p => p.type === "year")?.value), mes: Number(parts.find(p => p.type === "month")?.value), dia: Number(parts.find(p => p.type === "day")?.value) };
}
export function montarConteudoInsider(profissionais: ProfissionalInsider[], mes: string): ConteudoInsider {
  mesSchema.parse(mes);
  const [ano, numeroMes] = mes.split("-").map(Number);
  const aniversariantes: PessoaInsider[] = [], tempoCasa: PessoaInsider[] = [];
  for (const p of profissionais) {
    const f = p.fields;
    if (!["ATIVO", "EFETIVADO/ATIVO"].includes(f.field_1?.trim().toUpperCase() ?? "") || !f.Title?.trim()) continue;
    const base = { id: p.id, nome: f.Title.trim(), departamento: f.DEPARTAMENTOATUAL ?? "", escritorio: f.field_3 ?? "", foto: "" };
    const nasc = dataCivil(f.DATADENASC_x002e_), adm = dataCivil(f.field_4);
    if (nasc?.mes === numeroMes) aniversariantes.push({ ...base, dia: nasc.dia });
    if (adm?.mes === numeroMes && ano !== undefined && ano - adm.ano >= 1) tempoCasa.push({ ...base, dia: adm.dia, anos: ano - adm.ano });
  }
  const ordenar = (a: PessoaInsider, b: PessoaInsider) => a.dia - b.dia || a.nome.localeCompare(b.nome, "pt-BR");
  return { abertura: "", antesEventos: "", antesAniversarios: "", antesTempoCasa: "", encerramento: "", bannerMes: "", eventos: [], aniversariantes: aniversariantes.sort(ordenar), tempoCasa: tempoCasa.sort(ordenar) };
}