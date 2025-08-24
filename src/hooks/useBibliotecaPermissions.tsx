import { 
  verificarPermissaoMaterial, 
  criarUsuarioBiblioteca,
  type MaterialBiblioteca
} from "@/utils/bibliotecaPermissions";
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
  
  const turmaCode = getTurmaCode();
  const usuario = criarUsuarioBiblioteca(turmaCode);
  
  // Verifica se o usuário pode acessar um material específico
  const verificarPermissao = (material: MaterialBiblioteca) => {
    return verificarPermissaoMaterial(material, usuario);
  };
  
  return {
    turmaCode,
    isVisitante: turmaCode === "Visitante",
    verificarPermissao,
    usuario
  };
};