import { expect, it } from "vitest";
import { limparTextoFormatado, linkPermitido, textoParaEditor } from "@/lib/rich-text";
it('preserva formatação e o texto escolhido para links seguros', () => {
  expect(limparTextoFormatado('<b>Programa</b><a href="https://cronoslogistics.com.br">Saiba mais</a>')).toBe('<b>Programa</b><a href="https://cronoslogistics.com.br">Saiba mais</a>');
});
it('remove scripts, eventos e links executáveis de textos salvos', () => {
  expect(limparTextoFormatado('<script>alert(1)</script><b onclick="alert(1)">Olá</b><a href="javascript:alert(1)">Link</a>')).toBe('<b>Olá</b><a>Link</a>');
  expect(linkPermitido('javascript:alert(1)')).toBe(false);
  expect(linkPermitido('//evil.test')).toBe(false);
});
it('preserva quebras de linha e caracteres de textos antigos', () => {
  expect(textoParaEditor('Programa <novo>\nParticipe & ganhe')).toBe('Programa &lt;novo&gt;<br>Participe &amp; ganhe');
});