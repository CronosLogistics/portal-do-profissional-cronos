/** Regras puras do Controle de Saldos de férias (lista SharePoint "Férias Gozadas_"). */
export type ItemSaldo = { id: string; fields: Record<string, unknown> };

export type PeriodoFerias = {
  id: string;
  status: string;
  situacao: string;
  anoDireito: string;
  diasConcedidos: number;
  diasGozados: number;
  diasRestantes: number;
  /** Início do período aquisitivo (AAAA-MM-DD). */
  periodo: string | null;
  dataDireito: string | null;
  limiteGozo: string | null;
  regime: string;
  /** Pode solicitar: status "Agendar Férias" com saldo maior que zero. */
  podeSolicitar: boolean;
};

export const EMAIL_GESTAO_PESSOAS = "gestaodepessoas@cronoslogistics.com.br";

const texto = (v: unknown) => (typeof v === "string" ? v.trim() : typeof v === "number" ? String(v) : "");
const numero = (v: unknown) => {
  const n = Number(texto(v).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};
/** Datas do SharePoint chegam em UTC à meia-noite de Brasília. */
export const dataCivil = (v: unknown) => {
  const s = texto(v);
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
};
/** "2.026" (formatação numérica do SharePoint) vira "2026". */
export const anoLimpo = (v: unknown) => texto(v).replace(/\D/g, "");

/** Sem "Período" preenchido, o início do aquisitivo é o dia seguinte à Data de Direito do ano anterior. */
export function inicioAquisitivo(dataDireito: string | null): string | null {
  const m = dataDireito ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(dataDireito) : null;
  if (!m) return null;
  return new Date(Date.UTC(Number(m[1]) - 1, Number(m[2]) - 1, Number(m[3]) + 1)).toISOString().slice(0, 10);
}

/** Linhas do profissional (pelo ID na lista Profissionais Brasil), ordenadas pelo período aquisitivo mais recente. */
export function periodosDoProfissional(itens: ItemSaldo[], idsProfissional: string[]): PeriodoFerias[] {
  const ids = new Set(idsProfissional.map(String));
  return itens
    .filter((i) => ids.has(texto(i.fields["NomeLookupId"])))
    .map((i): PeriodoFerias => {
      const f = i.fields;
      const status = texto(f["Status"]);
      const diasRestantes = numero(f["Dias_x0020_Restantes"]);
      return {
        id: i.id,
        status,
        situacao: texto(f["Situa_x00e7__x00e3_o"]),
        anoDireito: anoLimpo(f["Ano_x0020_Direito"]),
        diasConcedidos: numero(f["Dias_x0020_Concedidos"]),
        diasGozados: numero(f["DiasGozados"]),
        diasRestantes,
        periodo: dataCivil(f["Per_x00ed_odo"]) ?? inicioAquisitivo(dataCivil(f["DatadeDireito"])),
        dataDireito: dataCivil(f["DatadeDireito"]),
        limiteGozo: dataCivil(f["LimitedoGozo"]),
        regime: texto(f["Regime"]),
        podeSolicitar: status.toLocaleLowerCase("pt-BR") === "agendar férias" && diasRestantes > 0,
      };
    })
    .sort((a, b) => (b.periodo ?? "").localeCompare(a.periodo ?? ""));
}

/** Data em que o profissional completa 12 meses de empresa (aniversário de 1 ano da admissão). */
export function dataUmAnoEmpresa(admissao: string | null): string | null {
  const m = admissao ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(admissao) : null;
  if (!m) return null;
  return new Date(Date.UTC(Number(m[1]) + 1, Number(m[2]) - 1, Number(m[3]))).toISOString().slice(0, 10);
}

export type CarenciaFerias = { bloqueado: boolean; admissao: string | null; liberaEm: string | null };

/** Regime atual: em transições ("ESTÁGIO/CLT", "CLT/PJ") vale o último. */
export function regimeAtual(regime: string | null | undefined): string {
  const partes = (regime ?? "").split("/").map((p) => p.trim().toLocaleUpperCase("pt-BR")).filter(Boolean);
  return partes[partes.length - 1] ?? "";
}

/** Regime do cadastro (Profissionais Brasil); sem ele, o do período aquisitivo mais recente. */
export function regimeDoProfissional(regimeCadastro: string | null | undefined, periodos: Pick<PeriodoFerias, "regime">[]): string {
  return regimeAtual(regimeCadastro) || regimeAtual(periodos.find((p) => p.regime)?.regime);
}

/** Só CLT: com menos de 1 ano de empresa as férias ainda não podem ser solicitadas. Outros regimes ou sem admissão conhecida, não bloqueia. */
export function carenciaFerias(admissao: string | null, hoje: string, regime: string): CarenciaFerias {
  if (regimeAtual(regime) !== "CLT") return { bloqueado: false, admissao: null, liberaEm: null };
  const liberaEm = dataUmAnoEmpresa(admissao);
  return { bloqueado: !!liberaEm && hoje < liberaEm, admissao: liberaEm ? admissao : null, liberaEm };
}

/** Quantidades oferecidas no modal, limitadas ao saldo e sempre incluindo o saldo integral. */
export function opcoesDias(saldo: number): number[] {
  if (saldo <= 0) return [];
  const base = [5, 10, 14, 15, 20, 30].filter((d) => d <= saldo);
  if (!base.includes(saldo)) base.push(saldo);
  return base.sort((a, b) => b - a);
}

/** Último dia de férias: início + quantidade − 1 (datas civis AAAA-MM-DD). */
export function dataTermino(inicio: string, dias: number): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(inicio);
  if (!m || dias < 1) return null;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]) + dias - 1));
  return d.toISOString().slice(0, 10);
}

export const formatarDataBr = (d: string | null) => (d ? d.split("-").reverse().join("/") : "-");

export type DadosEmailFerias = {
  nome: string; departamento: string | null; gestor: string | null;
  anoDireito: string; inicio: string; dias: number; saldo: number;
  abono?: boolean; observacoes?: string;
};

/** Monta o e-mail padrão de solicitação para Gestão de Pessoas. */
export function emailSolicitacao(d: DadosEmailFerias): { para: string; assunto: string; corpo: string; mailto: string } {
  const termino = dataTermino(d.inicio, d.dias);
  const extras = [
    d.abono ? "Abono pecuniário: Sim (venda de 1/3 das férias)" : null,
    d.observacoes?.trim() ? `Observações: ${d.observacoes.trim()}` : null,
  ].filter((l): l is string => !!l);
  const assunto = `Solicitação de Agendamento de Férias – ${d.nome}`;
  const corpo = [
    "Olá!",
    "",
    "Gostaria de solicitar o agendamento de parte dos meus dias de férias, conforme as informações abaixo:",
    "",
    "Dados do profissional",
    "",
    `Nome: ${d.nome}`,
    "",
    `Departamento: ${d.departamento ?? "-"}`,
    "",
    `Gestor direto: ${d.gestor ?? "-"}`,
    "",
    "Dados da solicitação",
    "",
    `Período aquisitivo: ${d.anoDireito}`,
    "",
    `Data de início desejada: ${formatarDataBr(d.inicio)}`,
    "",
    `Data de término desejada: ${formatarDataBr(termino)}`,
    "",
    `Quantidade de dias solicitados: ${d.dias}`,
    "",
    `Saldo disponível atual: ${d.saldo}`,
    "",
    ...extras.flatMap((l) => [l, ""]),
    "Solicito a avaliação e o retorno quanto à possibilidade de agendamento nas datas indicadas.",
    "",
    "Aguardo a confirmação.",
    "",
    "Atenciosamente,",
    d.nome,
  ].join("\n");
  const mailto = `mailto:${EMAIL_GESTAO_PESSOAS}?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(corpo)}`;
  return { para: EMAIL_GESTAO_PESSOAS, assunto, corpo, mailto };
}
