import { ListaConversasAluno } from "@/components/ajuda-rapida/ListaConversasAluno";
import { StudentHeader } from "@/components/StudentHeader";

const AjudaRapida = () => {
  return (
    <div className="min-h-screen bg-background">
      <StudentHeader pageTitle="Ajuda Rápida" />
      <ListaConversasAluno />
    </div>
  );
};

export default AjudaRapida;