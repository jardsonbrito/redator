import { useStudentAuth } from "./useStudentAuth";
import { normalizeTurmaToLetter } from "@/utils/turmaUtils";

export const useTurmaERestrictions = () => {
  const { studentData } = useStudentAuth();

  const isTurmaE = normalizeTurmaToLetter(studentData.turma) === "E";
  
  const isBlockedResource = (resourceType: string) => {
    if (!isTurmaE) return false;
    
    const blockedResources = [
      'exercicios',
      'enviar-redacao',
      'redacoes-exemplares', 
      'aulas'
    ];
    
    return blockedResources.includes(resourceType);
  };
  
  const shouldShowLimitedContent = (resourceType: string) => {
    if (!isTurmaE) return false;
    
    const limitedResources = ['temas', 'videoteca'];
    return limitedResources.includes(resourceType);
  };
  
  return {
    isTurmaE,
    isBlockedResource,
    shouldShowLimitedContent
  };
};