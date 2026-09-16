import { getTurmaColorClasses } from "./turmaUtils";

// Verifica se uma redação está congelada (prazo de 7 dias expirado)
export const estaCongelada = (redacao: {
  data_envio: string;
  corrigida: boolean;
  congelada?: boolean;
  data_descongelamento?: string | null;
}): boolean => {
  // Se já foi corrigida, não pode estar congelada
  if (redacao.corrigida) return false;

  // Se foi descongelada por um admin, não está congelada
  if (redacao.data_descongelamento) return false;

  // Se já está marcada como congelada no banco, retornar true
  if (redacao.congelada) return true;

  // Calcular se o prazo de 7 dias expirou
  const prazoLimite = new Date(redacao.data_envio);
  prazoLimite.setDate(prazoLimite.getDate() + 7);
  return new Date() > prazoLimite;
};

export const getStatusColor = (status: string, corrigida: boolean) => {
  if (status === "congelada") return "bg-cyan-100 text-cyan-800 border-cyan-200";
  if (status === "devolvida") return "bg-orange-100 text-orange-800 border-orange-200";
  if (status === "reenvio") return "bg-purple-100 text-purple-800 border-purple-200";
  if (status === "incompleta") return "bg-amber-100 text-amber-800 border-amber-200";
  if (corrigida || status === "corrigido") return "bg-green-100 text-green-800 border-green-200";
  if (status === "em_correcao") return "bg-blue-100 text-blue-800 border-blue-200";
  if (status === "aguardando" || status === "pendente") return "bg-yellow-100 text-yellow-800 border-yellow-200";
  return "bg-gray-100 text-gray-800 border-gray-200";
};

export const getStatusLabel = (status: string, corrigida: boolean) => {
  if (status === "congelada") return "Congelada";
  if (corrigida || status === "corrigido") return "Redação corrigida";
  if (status === "reenvio") return "Reenvio";
  if (status === "em_correcao") return "Em correção";
  if (status === "incompleta") return "Em correção";
  if (status === "aguardando" || status === "pendente") return "Aguardando correção";
  return "Aguardando correção";
};

export const getTurmaColor = (turma: string) => {
  // Usar função centralizada que aceita qualquer formato de turma
  return getTurmaColorClasses(turma);
};
