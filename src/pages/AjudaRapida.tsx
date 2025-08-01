import { useState } from "react";
import { ListaConversasAluno } from "@/components/ajuda-rapida/ListaConversasAluno";
import { StudentHeader } from "@/components/StudentHeader";

const AjudaRapida = () => {
  const [conversaAtiva, setConversaAtiva] = useState<{
    corretorId: string;
    corretorNome: string;
  } | null>(null);

  const pageTitle = conversaAtiva ? conversaAtiva.corretorNome : "Ajuda Rápida";

  return (
    <div className="min-h-screen bg-background">
      <StudentHeader pageTitle={pageTitle} />
      <ListaConversasAluno 
        onConversaChange={setConversaAtiva}
      />
    </div>
  );
};

export default AjudaRapida;