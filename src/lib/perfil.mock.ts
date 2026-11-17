/** Dados de demonstração do perfil profissional (frontend only). */

export type PerfilBadge = {
  id: string;
  titulo: string;
  descricao: string;
  icone: "rocket" | "heart" | "book" | "cake" | "users" | "trophy";
  fixada?: boolean;
  bloqueada?: boolean;
};

export type PerfilElogio = {
  id: string;
  iniciais: string;
  autor: string;
  papel: string;
  quando: string;
  texto: string;
};

export type PerfilTreinamento = {
  id: string;
  titulo: string;
  detalhe: string;
  tipo: "certificado" | "treinamento";
};

export type PerfilDemo = {
  cargo: string;
  area: string;
  unidade: string;
  desde: string;
  gestor: string;
  aniversario: string;
  sobre: string;
  stats: {
    badges: number;
    elogios: number;
    treinamentos: number;
    certificados: number;
  };
  badges: PerfilBadge[];
  elogios: PerfilElogio[];
  treinamentos: PerfilTreinamento[];
  competencias: string[];
  privacidade: {
    mostrarBadges: boolean;
    mostrarAniversario: boolean;
    mostrarElogios: boolean;
  };
};

export const PERFIL_DEMO: PerfilDemo = {
  cargo: "Analista de Sistemas Pleno",
  area: "Tecnologia",
  unidade: "Itajaí (Matriz)",
  desde: "mar/2021",
  gestor: "Rafael Lima",
  aniversario: "22 de abril",
  sobre:
    "Profissional de tecnologia focada em integrações, dados e melhoria contínua. Gosto de transformar processos manuais em fluxos claros e de apoiar o time com soluções práticas no dia a dia da Cronos.",
  stats: {
    badges: 12,
    elogios: 27,
    treinamentos: 9,
    certificados: 4,
  },
  badges: [
    {
      id: "inovadora",
      titulo: "Inovadora",
      descricao: "Fixada · Out/2026",
      icone: "rocket",
      fixada: true,
    },
    {
      id: "parceira",
      titulo: "Parceira de time",
      descricao: "Fixada · Ago/2026",
      icone: "heart",
      fixada: true,
    },
    {
      id: "aprendendo",
      titulo: "Sempre aprendendo",
      descricao: "5 treinamentos no ano",
      icone: "book",
      fixada: true,
    },
    {
      id: "cinco-anos",
      titulo: "5 anos de casa",
      descricao: "Mar/2026",
      icone: "cake",
    },
    {
      id: "mentora",
      titulo: "Mentora",
      descricao: "Mentoria para 3 pessoas",
      icone: "users",
    },
    {
      id: "destaque",
      titulo: "Destaque do ano",
      descricao: "Bloqueada · em breve",
      icone: "trophy",
      bloqueada: true,
    },
  ],
  elogios: [
    {
      id: "e1",
      iniciais: "RL",
      autor: "Rafael Lima",
      papel: "Gestor",
      quando: "há 2 semanas",
      texto:
        "Maria liderou a integração crítica com agilidade e clareza. O time ganhou previsibilidade e qualidade nas entregas.",
    },
    {
      id: "e2",
      iniciais: "MS",
      autor: "Marina Souza",
      papel: "Analista",
      quando: "há 1 mês",
      texto:
        "Sempre disponível para ajudar e explicar. Tornou o onboarding técnico muito mais leve para quem chegou.",
    },
    {
      id: "e3",
      iniciais: "JO",
      autor: "João Oliveira",
      papel: "Coordenador",
      quando: "há 2 meses",
      texto:
        "Excelente parceria na priorização de melhorias. Comunicação objetiva e foco no que gera resultado.",
    },
  ],
  treinamentos: [
    {
      id: "t1",
      titulo: "AWS Certified Cloud Practitioner",
      detalhe: "Certificado · concluído em set/2026",
      tipo: "certificado",
    },
    {
      id: "t2",
      titulo: "Integrações e APIs na Cronos",
      detalhe: "Treinamento interno · ago/2026",
      tipo: "treinamento",
    },
    {
      id: "t3",
      titulo: "Power BI para operações",
      detalhe: "Certificado · concluído em jun/2026",
      tipo: "certificado",
    },
  ],
  competencias: ["Python", "Integração de sistemas", "SQL", "Power BI", "Comunicação"],
  privacidade: {
    mostrarBadges: true,
    mostrarAniversario: true,
    mostrarElogios: false,
  },
};

export function iniciaisDe(nome: string) {
  return nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase() ?? "")
    .join("");
}
