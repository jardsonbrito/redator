import { getTurmaColorClasses } from "./turmaUtils";

export const getStatusColor = (status: string, corrigida: boolean) => {
  if (status === "devolvida") return "bg-orange-100 text-orange-800 border-orange-200";
  if (status === "incompleta") return "bg-amber-100 text-amber-800 border-amber-200";
  if (corrigida || status === "corrigido") return "bg-green-100 text-green-800 border-green-200";
  if (status === "em_correcao") return "bg-blue-100 text-blue-800 border-blue-200";
  if (status === "aguardando" || status === "pendente") return "bg-yellow-100 text-yellow-800 border-yellow-200";
  return "bg-gray-100 text-gray-800 border-gray-200";
};

export const getStatusLabel = (status: string, corrigida: boolean) => {
  if (corrigida || status === "corrigido") return "Redação corrigida";
  if (status === "em_correcao") return "Em correção";
  if (status === "incompleta") return "Em correção";
  if (status === "aguardando" || status === "pendente") return "Aguardando correção";
  return "Aguardando correção";
};

export const getTurmaColor = (turma: string) => {
  // Usar função centralizada que aceita qualquer formato de turma
  return getTurmaColorClasses(turma);
};
