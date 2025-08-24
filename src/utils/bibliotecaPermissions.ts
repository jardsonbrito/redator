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
  
  console.log(`[PERMISSÃO] Material "${material.titulo}":`, {
    turmasAutorizadas,
    permiteVisitante,
    usuario,
    status: material.status
  });
  
  if (usuario.isVisitante) {
    // Visitantes só veem materiais que explicitamente permitem visitantes
    const result = permiteVisitante;
    console.log(`[VISITANTE] ${material.titulo}: ${result ? 'PERMITIDO' : 'NEGADO'}`);
    return result;
  } else {
    // Para alunos, as regras são:
    // 1. Se turmas_autorizadas está vazio E permite_visitante é true = TODOS podem ver
    // 2. Se turmas_autorizadas tem valores E inclui a turma do aluno = PERMITIDO  
    // 3. Se turmas_autorizadas tem valores E permite_visitante é true = PERMITIDO (liberado para todos)
    // 4. Caso contrário = NEGADO
    
    const semRestricaoTurma = turmasAutorizadas.length === 0;
    const turmaEstaAutorizada = usuario.turma ? turmasAutorizadas.includes(usuario.turma) : false;
    
    let result = false;
    let motivo = '';
    
    if (semRestricaoTurma && permiteVisitante) {
      result = true;
      motivo = 'sem restrição de turma + permite visitante';
    } else if (turmaEstaAutorizada) {
      result = true;
      motivo = 'turma está autorizada';
    } else if (permiteVisitante) {
      result = true;
      motivo = 'permite visitante (liberado para todos)';
    } else {
      result = false;
      motivo = 'sem permissão';
    }
    
    console.log(`[ALUNO] ${material.titulo}: ${result ? 'PERMITIDO' : 'NEGADO'} (${motivo})`);
    return result;
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