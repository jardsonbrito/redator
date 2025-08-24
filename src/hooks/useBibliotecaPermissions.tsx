import { useStudentAuth } from "./useStudentAuth";

export const useBibliotecaPermissions = () => {
  const { studentData } = useStudentAuth();
  
  // Determina a turma do usuário
  const getTurmaCode = () => {
    if (studentData.userType === "aluno" && studentData.turma) {
      return studentData.turma;
    }
    return "Visitante";
  };
  
  // Verifica se o usuário pode acessar um material específico
  const verificarPermissao = (material: any) => {
    const turmaCode = getTurmaCode();
    const turmasAutorizadas = material.turmas_autorizadas || [];
    const permiteVisitante = material.permite_visitante;
    
    if (turmaCode === "Visitante") {
      // Visitantes só veem materiais que explicitamente permitem visitantes
      return permiteVisitante === true;
    } else {
      // Alunos veem materiais se:
      // 1. Sua turma está na lista de turmas autorizadas OU
      // 2. O material permite visitantes (se não há turmas específicas)
      const turmaEstaAutorizada = turmasAutorizadas.includes(turmaCode);
      const semRestricaoTurma = turmasAutorizadas.length === 0 && permiteVisitante;
      
      return turmaEstaAutorizada || semRestricaoTurma;
    }
  };
  
  // Filtra uma lista de materiais baseado nas permissões
  const filtrarMateriais = (materiais: any[]) => {
    return materiais.filter(verificarPermissao);
  };
  
  return {
    turmaCode: getTurmaCode(),
    isVisitante: getTurmaCode() === "Visitante",
    verificarPermissao,
    filtrarMateriais
  };
};