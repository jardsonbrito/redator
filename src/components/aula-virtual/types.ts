
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
}

export interface RegistroPresenca {
  aula_id: string;
  tipo_registro: 'entrada' | 'saida';
}

export interface AulaVirtualAtivaProps {
  turmaCode: string;
}
