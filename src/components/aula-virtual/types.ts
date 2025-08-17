
export interface AulaVirtual {
  id: string;
  titulo: string;
  descricao: string;
  data_aula: string;
  horario_inicio: string;
  horario_fim: string;
  turmas_autorizadas: string[];
  imagem_capa_url: string;
  link_meet: string;
  abrir_aba_externa: boolean;
  permite_visitante: boolean;
  ativo: boolean;
  eh_aula_ao_vivo?: boolean;
  status_transmissao?: 'agendada' | 'em_transmissao' | 'encerrada';
}

export interface RegistroPresenca {
  aula_id: string;
  aluno_id: string;
  entrada_at: string | null;
  saida_at: string | null;
}

export interface AulaVirtualAtivaProps {
  turmaCode: string;
}
