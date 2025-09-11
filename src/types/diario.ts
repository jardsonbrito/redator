// Tipos TypeScript para o sistema de Diário Online

export interface EtapaEstudo {
  id: string;
  nome: string;
  numero: number;
  data_inicio: string;
  data_fim: string;
  ativo: boolean;
  turma: string;
  created_at: string;
  updated_at: string;
}

export interface AulaDiario {
  id: string;
  turma: string;
  data_aula: string;
  conteudo_ministrado: string;
  observacoes?: string;
  etapa_id: string;
  professor_email?: string;
  created_at: string;
  updated_at: string;
}

export interface PresencaParticipacao {
  id: string;
  aula_id: string;
  aluno_email: string;
  turma: string;
  presente: boolean;
  participou: boolean;
  observacoes_aluno?: string;
  created_at: string;
  updated_at: string;
}

export interface DadosFrequencia {
  total_aulas: number;
  aulas_presentes: number;
  percentual_frequencia: number;
}

export interface DadosParticipacao {
  total_aulas: number;
  aulas_participou: number;
  percentual_participacao: number;
}

export interface DadosRedacoes {
  total_redacoes: number;
  nota_media: number;
}

export interface DadosSimulados {
  total_simulados: number;
  nota_media: number;
}

export interface DadosExercicios {
  total_exercicios: number;
}

export interface DiarioEtapa {
  etapa_id: string;
  etapa_nome: string;
  etapa_numero: number;
  data_inicio: string;
  data_fim: string;
  frequencia: DadosFrequencia;
  participacao: DadosParticipacao;
  redacoes: DadosRedacoes;
  simulados: DadosSimulados;
  exercicios: DadosExercicios;
  media_final: number;
}

export interface ResumoAlunoTurma {
  aluno_email: string;
  aluno_nome: string;
  dados: DiarioEtapa;
}

export interface ResumoTurmaEtapa {
  etapa: {
    id: string;
    nome: string;
    numero: number;
    data_inicio: string;
    data_fim: string;
  };
  total_aulas_previstas: number;
  alunos: ResumoAlunoTurma[];
}

// Props para componentes

export interface FormEtapaProps {
  turma?: string;
  etapa?: EtapaEstudo;
  onSave: (etapa: Partial<EtapaEstudo>) => void;
  onCancel: () => void;
}

export interface FormAulaProps {
  turma?: string;
  aula?: AulaDiario;
  onSave: (aula: Partial<AulaDiario>) => void;
  onCancel: () => void;
}

export interface PresencaAulaProps {
  aula: AulaDiario;
  alunos: string[];
  presencas: PresencaParticipacao[];
  onUpdatePresenca: (alunoEmail: string, presente: boolean, participou: boolean) => void;
}

export interface DiarioAlunoProps {
  alunoEmail: string;
  turma: string;
  etapas: DiarioEtapa[];
}

export interface ResumoProfessorProps {
  turma: string;
  etapa: number;
  resumo: ResumoTurmaEtapa;
  onExportarCSV: () => void;
}

// Tipos para formulários

export interface FormEtapaData {
  nome: string;
  numero: number;
  data_inicio: string;
  data_fim: string;
  turma: string;
}

export interface FormAulaData {
  turma: string;
  data_aula: string;
  conteudo_ministrado: string;
  observacoes?: string;
}

export interface PresencaFormData {
  [alunoEmail: string]: {
    presente: boolean;
    participou: boolean;
    observacoes?: string;
  };
}

// Enums

export enum StatusEtapa {
  ATIVA = 'ativa',
  INATIVA = 'inativa',
  CONCLUIDA = 'concluida'
}

export enum TipoVisualizacao {
  INDIVIDUAL = 'individual',
  TURMA = 'turma',
  GERAL = 'geral'
}

// Utilitários

export const NUMEROS_ETAPAS = [1, 2, 3, 4] as const;
export const NOMES_ETAPAS = ['1ª Etapa', '2ª Etapa', '3ª Etapa', '4ª Etapa'] as const;

export type NumeroEtapa = typeof NUMEROS_ETAPAS[number];
export type NomeEtapa = typeof NOMES_ETAPAS[number];