import {
  CalendarCheck, ClipboardList, ClipboardSignature, MailCheck, Trophy, Users, Award, GraduationCap,
  type LucideIcon,
} from "lucide-react";

import emailCadastro from "@/assets/treinamentos/email-aprovacao-cadastro.jpg.asset.json";
import emailAgendamento from "@/assets/treinamentos/email-aprovacao-agendamento.jpg.asset.json";
import emailFeedback from "@/assets/treinamentos/email-feedback.jpg.asset.json";
import formAgendamentoDireto from "@/assets/treinamentos/form-agendamento-direto.png.asset.json";
import conviteParticipantes from "@/assets/treinamentos/convite-participantes.png.asset.json";
import execucaoTreinamento from "@/assets/treinamentos/execucao-treinamento.png.asset.json";
import posTreinamento from "@/assets/treinamentos/pos-treinamento.png.asset.json";

/** Formulários oficiais da Gestão de Pessoas (SharePoint). */
export const LINKS = {
  cadastroTreinamento:
    "https://cronoslogisticscombr.sharepoint.com/:l:/s/peoplemanagementteamgroup/JADwCY8zpHqyRpbMe1Jz7EAvAbRIR8CIhYqiqdc3bMjD4zg?nav=NTAwNTljZjItMGM0MS00MzM0LWI3YjItOTAwOTc3OGI0MDli",
  agendamentoDireto:
    "https://cronoslogisticscombr.sharepoint.com/:l:/s/peoplemanagementteamgroup/JADNvjVnDBI2TL9QuHyTvS3bAZq3NXpvrcHRGPjiP9i0lWo?nav=OTJkMTY5NzQtZGI0My00MWFjLTg5NDYtYzdmOWE0ODdjMjY1",
  diplomasCertificados:
    "https://cronoslogisticscombr.sharepoint.com/sites/peoplemanagementteamgroup/_layouts/15/listforms.aspx?cid=MzM4ZjA5ZjAtN2FhNC00NmIyLTk2Y2MtN2I1MjczZWM0MDJm&nav=NTA4MzQ1MzUtZjM4YS00YmFmLWE1NDAtMjA5MjkwZTY4ZWVk",
} as const;

export const CERTIFICADOS: { icon: LucideIcon; title: string; description: string }[] = [
  {
    icon: GraduationCap,
    title: "Diploma",
    description:
      "Cadastre seus diplomas de pós-graduação e especializações concluídas para obter reconhecimento e pontuação.",
  },
  {
    icon: Award,
    title: "Certificados em geral",
    description:
      "Cadastre os certificados de cursos e treinamentos concluídos que estejam relacionados à sua área de atuação na Cronos. Os documentos enviados serão analisados e validados pela equipe de Gestão de Pessoas para fins de reconhecimento e pontuação.",
  },
];

export const PONTUACAO = [
  { categoria: "Treinamento externo promovido pela Cronos", pontos: 100 },
  { categoria: "Treinamento Interno (entre setores)", pontos: 60 },
  { categoria: "Pós-graduação / Especialização", pontos: 200 },
  { categoria: "Curso/Treinamento externo por iniciativa do profissional", pontos: 100 },
];

export type Step = {
  num: string;
  icon: LucideIcon;
  title: string;
  description: string;
  bullets?: string[];
  cta?: { label: string; href: string };
  image?: string;
  imageAlt?: string;
  badge?: string;
};

export const STEPS: Step[] = [
  {
    num: "01",
    icon: ClipboardList,
    title: "Cadastro do Treinamento",
    description:
      "Tudo começa aqui. O líder cadastra o treinamento e a solicitação segue para a área de Gestão de Pessoas para avaliação.",
    cta: { label: "Acessar formulário de cadastro", href: LINKS.cadastroTreinamento },
    image: emailCadastro.url,
    imageAlt: "E-mail de aprovação do cadastro do treinamento",
  },
  {
    num: "1.5",
    icon: CalendarCheck,
    title: "Atalho: Agendamento Direto",
    description:
      "Se o treinamento já foi realizado anteriormente e possui cadastro no sistema, o líder pode solicitar diretamente um novo agendamento por meio desta opção, sem a necessidade de realizar um novo cadastro.",
    cta: { label: "Agendar treinamento existente", href: LINKS.agendamentoDireto },
    image: formAgendamentoDireto.url,
    imageAlt: "Formulário de solicitação de realização de treinamento",
  },
  {
    num: "02",
    icon: MailCheck,
    title: "Agendamento do Treinamento",
    description:
      "Aprovado? O líder responsável receberá um e-mail com o link para realizar o agendamento do treinamento. Nesta etapa, deverão ser informadas as turmas, datas, horários, local e demais informações necessárias para a realização da capacitação. Importante: o agendamento também passará por validação antes da confirmação final.",
    bullets: ["Turmas", "Datas e horários", "Local", "Demais informações"],
    image: emailAgendamento.url,
    imageAlt: "E-mail de aprovação do agendamento",
  },
  {
    num: "03",
    icon: Users,
    title: "Convite aos Participantes",
    description:
      "Com o agendamento aprovado, todos os participantes recebem automaticamente o convite na agenda, conforme a turma definida.",
    image: conviteParticipantes.url,
    imageAlt: "Convite de treinamento na agenda dos participantes",
    badge: "Automático",
  },
  {
    num: "04",
    icon: ClipboardSignature,
    title: "Execução do Treinamento",
    description:
      "O líder deve imprimir a lista de presença por turma, enviada no e-mail, e coletar a assinatura de todos.",
    bullets: ["Imprimir o RQ-02-16 - Registro de Treinamento", "Coletar assinaturas"],
    image: execucaoTreinamento.url,
    imageAlt: "E-mail de treinamento aprovado e registro de presença",
  },
  {
    num: "05",
    icon: MailCheck,
    title: "Pós-Treinamento",
    description:
      "Um dia após o treinamento, o líder receberá um e-mail solicitando o envio do RQ-02-16 - Registro de Treinamento assinado para a Gestão de Pessoas.",
    bullets: ["RQ-02-16 - Registro de Treinamento assinado"],
    image: posTreinamento.url,
    imageAlt: "E-mail de pós-treinamento solicitando anexos da lista de presença",
  },
  {
    num: "06",
    icon: Trophy,
    title: "Avaliação e Pontuação",
    description:
      "Gestão de Pessoas valida os documentos em até 3 dias, processa as informações e garante a pontuação dos participantes. Os participantes recebem ainda um e-mail para dar feedback do treinamento.",
    image: emailFeedback.url,
    imageAlt: "E-mail enviado aos participantes solicitando feedback",
  },
];
