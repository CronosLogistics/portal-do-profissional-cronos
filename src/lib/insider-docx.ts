import { Document, HeadingLevel, Packer, Paragraph, TextRun } from "docx";
import { formatarDataEvento, nomeMes, type ConteudoInsider, type PessoaInsider } from "./insider.rules";
import { textoPlano } from "./rich-text";

function titulo(texto: string) {
  return new Paragraph({ text: texto, heading: HeadingLevel.HEADING_1, spacing: { before: 360, after: 160 } });
}
function subtitulo(texto: string) {
  return new Paragraph({ text: texto, heading: HeadingLevel.HEADING_2, spacing: { before: 280, after: 120 } });
}
function corpo(html: string) {
  const plano = textoPlano(html);
  if (!plano) return [];
  return [new Paragraph({ children: [new TextRun(plano)], spacing: { after: 120 } })];
}
function pessoa(p: PessoaInsider, mesAno: string) {
  const mesNome = nomeMes(mesAno).split(" de ")[0];
  const detalhe = [
    p.anos ? `${p.anos} ${p.anos === 1 ? "ano" : "anos"}` : null,
    [p.departamento, p.escritorio].filter(Boolean).join(" · ") || null,
    `${String(p.dia).padStart(2, "0")} de ${mesNome}`,
  ].filter(Boolean).join(" · ");
  return new Paragraph({
    children: [
      new TextRun({ text: p.nome, bold: true }),
      ...(detalhe ? [new TextRun({ text: ` — ${detalhe}` })] : []),
    ],
    spacing: { after: 80 },
  });
}

/** Gera e dispara o download de um .docx da edição do Cronos Insider (rascunho ou publicada). */
export async function exportarInsiderDocx(tituloEdicao: string, mesAno: string, conteudo: ConteudoInsider) {
  const filhos: Paragraph[] = [
    new Paragraph({
      children: [new TextRun({ text: "Cronos Insider", bold: true, size: 36 })],
      spacing: { after: 80 },
    }),
    new Paragraph({
      children: [new TextRun({ text: `${tituloEdicao} · ${nomeMes(mesAno)}`, italics: true })],
      spacing: { after: 240 },
    }),
  ];

  filhos.push(titulo("Abertura"), ...corpo(conteudo.abertura));
  filhos.push(titulo("Destaques do mês"), ...corpo(conteudo.antesEventos));
  if (conteudo.eventos.length) {
    filhos.push(subtitulo("Eventos"));
    for (const e of conteudo.eventos) {
      filhos.push(new Paragraph({
        children: [new TextRun({ text: e.titulo || "Evento", bold: true })],
        spacing: { before: 160, after: 40 },
      }));
      if (e.data) filhos.push(new Paragraph({ children: [new TextRun({ text: formatarDataEvento(e.data), italics: true })], spacing: { after: 40 } }));
      filhos.push(...corpo(e.descricao));
    }
  }
  filhos.push(titulo("Aniversariantes"), ...corpo(conteudo.antesAniversarios));
  for (const p of conteudo.aniversariantes) filhos.push(pessoa(p, mesAno));
  filhos.push(titulo("Tempo de empresa"), ...corpo(conteudo.antesTempoCasa));
  for (const p of conteudo.tempoCasa) filhos.push(pessoa(p, mesAno));
  filhos.push(titulo("Encerramento"), ...corpo(conteudo.encerramento));

  const doc = new Document({
    sections: [{ properties: {}, children: filhos }],
  });
  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `cronos-insider-${mesAno}.docx`;
  a.click();
  URL.revokeObjectURL(url);
}
