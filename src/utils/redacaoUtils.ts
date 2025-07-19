
export const getStatusColor = (status: string, corrigida: boolean) => {
  if (corrigida || status === "corrigido") return "bg-green-100 text-green-800";
  if (status === "em_correcao") return "bg-orange-100 text-orange-800";
  if (status === "incompleta") return "bg-blue-100 text-blue-800";
  if (status === "aguardando" || status === "pendente") return "bg-yellow-100 text-yellow-800";
  return "bg-gray-100 text-gray-800";
};

export const getStatusLabel = (status: string, corrigida: boolean) => {
  if (corrigida || status === "corrigido") return "🟢 Redação corrigida";
  if (status === "em_correcao") return "🟠 Em correção";
  if (status === "incompleta") return "🔵 Incompleta";
  if (status === "aguardando" || status === "pendente") return "🟡 Aguardando correção";
  return "🔹 Pendente";
};

export const getTurmaColor = (turma: string) => {
  const colors = {
    "Turma A": "bg-blue-100 text-blue-800",
    "Turma B": "bg-green-100 text-green-800", 
    "Turma C": "bg-purple-100 text-purple-800",
    "Turma D": "bg-orange-100 text-orange-800",
    "Turma E": "bg-pink-100 text-pink-800",
    "Visitante": "bg-gray-100 text-gray-800"
  };
  return colors[turma as keyof typeof colors] || "bg-gray-100 text-gray-800";
};
