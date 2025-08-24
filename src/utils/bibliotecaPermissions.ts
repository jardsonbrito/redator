/**
 * Utilitário puro para verificar permissões de biblioteca
 * Centraliza toda a lógica de permissões em um local
 */

export interface MaterialBiblioteca {
  id: string;
  turmas_autorizadas: string[] | null;
  permite_visitante: boolean | null;
  titulo: string;
  status: string;
}

export interface UsuarioBiblioteca {
  turma: string | null;
  isVisitante: boolean;
}

/**
 * Verifica se um usuário pode acessar um material específico
 */
export const verificarPermissaoMaterial = (
  material: MaterialBiblioteca,
  usuario: UsuarioBiblioteca
): boolean => {
  // Material deve estar publicado
  if (material.status !== 'publicado') {
    return false;
  }

  const turmasAutorizadas = material.turmas_autorizadas || [];
  const permiteVisitante = material.permite_visitante === true;
  
  if (usuario.isVisitante) {
    // Visitantes só veem materiais que explicitamente permitem visitantes
    return permiteVisitante;
  } else {
    // Alunos veem materiais se:
    // 1. Sua turma está na lista de turmas autorizadas OU
    // 2. O material permite visitantes (se não há turmas específicas)
    const turmaEstaAutorizada = usuario.turma ? turmasAutorizadas.includes(usuario.turma) : false;
    const semRestricaoTurma = turmasAutorizadas.length === 0 && permiteVisitante;
    
    return turmaEstaAutorizada || semRestricaoTurma;
  }
};

/**
 * Filtra uma lista de materiais baseado nas permissões do usuário
 */
export const filtrarMateriaisPermitidos = (
  materiais: MaterialBiblioteca[],
  usuario: UsuarioBiblioteca
): MaterialBiblioteca[] => {
  return materiais.filter(material => verificarPermissaoMaterial(material, usuario));
};

/**
 * Converte dados do studentAuth para o formato esperado pelo utilitário
 */
export const criarUsuarioBiblioteca = (turmaCode: string): UsuarioBiblioteca => {
  return {
    turma: turmaCode === "Visitante" ? null : turmaCode,
    isVisitante: turmaCode === "Visitante"
  };
};