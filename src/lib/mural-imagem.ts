/** Limite de imagem do mural; espelha o limite configurado no armazenamento "mural". */
export const LIMITE_IMAGEM_MURAL_MB = 18;
export const LIMITE_IMAGEM_MURAL_BYTES = LIMITE_IMAGEM_MURAL_MB * 1024 * 1024;

/** Retorna a mensagem de erro quando a imagem passa do limite, ou null quando pode ser enviada. */
export function erroTamanhoImagemMural(arquivo: Pick<File, "size">): string | null {
  if (arquivo.size <= LIMITE_IMAGEM_MURAL_BYTES) return null;
  const mb = (arquivo.size / 1024 / 1024).toFixed(1).replace(".", ",");
  return `A imagem tem ${mb} MB e passa do limite de ${LIMITE_IMAGEM_MURAL_MB} MB. Reduza o tamanho e tente novamente.`;
}
