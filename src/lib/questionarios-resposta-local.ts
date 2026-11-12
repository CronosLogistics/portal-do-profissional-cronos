import {
  aplicarRascunhoRespostas,
  rascunhoRespostaTemProgresso,
  type PerguntaQuestionario,
  type RascunhoRespostaLocal,
  type RespostaItem,
} from "@/lib/questionarios.rules";

const PREFIXO = "portal-cronos:questionario-resposta:";

export function chaveRascunhoRespostaLocal(usuarioId: string, questionarioId: string) {
  return `${PREFIXO}${usuarioId}:${questionarioId}`;
}

function storageDisponivel(): Storage | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

export function lerRascunhoRespostaLocal(usuarioId: string, questionarioId: string): RascunhoRespostaLocal | null {
  const storage = storageDisponivel();
  if (!storage || !usuarioId || !questionarioId) return null;
  try {
    const raw = storage.getItem(chaveRascunhoRespostaLocal(usuarioId, questionarioId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<RascunhoRespostaLocal>;
    if (parsed.questionarioId !== questionarioId || !Array.isArray(parsed.perguntaIds) || !Array.isArray(parsed.respostas)) return null;
    return {
      questionarioId,
      perguntaIds: parsed.perguntaIds.filter((id): id is string => typeof id === "string"),
      respostas: parsed.respostas as RespostaItem[],
      atualizadoEm: typeof parsed.atualizadoEm === "string" ? parsed.atualizadoEm : new Date(0).toISOString(),
    };
  } catch {
    return null;
  }
}

export function gravarRascunhoRespostaLocal(
  usuarioId: string,
  questionarioId: string,
  perguntas: PerguntaQuestionario[],
  respostas: RespostaItem[],
) {
  const storage = storageDisponivel();
  if (!storage || !usuarioId || !questionarioId) return;
  const chave = chaveRascunhoRespostaLocal(usuarioId, questionarioId);
  if (!rascunhoRespostaTemProgresso(perguntas, respostas)) {
    try { storage.removeItem(chave); } catch { /* ignore quota/private mode */ }
    return;
  }
  const payload: RascunhoRespostaLocal = {
    questionarioId,
    perguntaIds: perguntas.map(p => p.id),
    respostas,
    atualizadoEm: new Date().toISOString(),
  };
  try {
    storage.setItem(chave, JSON.stringify(payload));
  } catch {
    /* ignore quota/private mode */
  }
}

export function limparRascunhoRespostaLocal(usuarioId: string, questionarioId: string) {
  const storage = storageDisponivel();
  if (!storage || !usuarioId || !questionarioId) return;
  try {
    storage.removeItem(chaveRascunhoRespostaLocal(usuarioId, questionarioId));
  } catch {
    /* ignore */
  }
}

export function carregarRespostasLocais(
  usuarioId: string | undefined,
  questionarioId: string,
  perguntas: PerguntaQuestionario[],
): RespostaItem[] | null {
  if (!usuarioId) return null;
  return aplicarRascunhoRespostas(perguntas, lerRascunhoRespostaLocal(usuarioId, questionarioId));
}

export function temRascunhoRespostaLocal(usuarioId: string | undefined, questionarioId: string, perguntas: PerguntaQuestionario[]): boolean {
  const respostas = carregarRespostasLocais(usuarioId, questionarioId, perguntas);
  return respostas !== null && rascunhoRespostaTemProgresso(perguntas, respostas);
}
