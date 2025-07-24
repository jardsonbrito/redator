import { useStudentAuth } from "./useStudentAuth";

export const useTurmaERestrictions = () => {
  const { studentData } = useStudentAuth();
  
  const isTurmaE = studentData.turma === "Turma E";
  
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