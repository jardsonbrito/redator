import { useEffect, useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAjudaRapida } from "@/hooks/useAjudaRapida";
import { useStudentAuth } from "@/hooks/useStudentAuth";

export const AjudaRapidaCard = () => {
  const navigate = useNavigate();
  const { buscarMensagensNaoLidasAluno } = useAjudaRapida();
  const { studentData } = useStudentAuth();
  const [mensagensNaoLidas, setMensagensNaoLidas] = useState(0);

  useEffect(() => {
    if (studentData.email) {
      const fetchMensagensNaoLidas = async () => {
        const count = await buscarMensagensNaoLidasAluno(studentData.email);
        setMensagensNaoLidas(count);
      };
      
      fetchMensagensNaoLidas();
      
      // Atualizar a cada 30 segundos
      const interval = setInterval(fetchMensagensNaoLidas, 30000);
      
      // Escutar evento customizado para atualizar badge quando mensagens forem lidas
      const handleMensagensLidas = () => {
        fetchMensagensNaoLidas();
      };
      
      window.addEventListener('mensagensLidas', handleMensagensLidas);
      
      return () => {
        clearInterval(interval);
        window.removeEventListener('mensagensLidas', handleMensagensLidas);
      };
    }
  }, [studentData.email, buscarMensagensNaoLidasAluno]);

  return (
    <Card 
      className="bg-white hover:shadow-md transition-all duration-200 cursor-pointer border-l-4 border-l-primary relative"
      onClick={() => navigate('/ajuda-rapida')}
    >
      <CardContent className="flex items-center justify-between p-6">
        <div className="flex items-center space-x-4">
          <div className="bg-primary/10 p-3 rounded-lg">
            <MessageSquare className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-lg text-foreground">Ajuda Rápida</h3>
            <p className="text-sm text-muted-foreground">
              Converse com seus corretores
            </p>
          </div>
        </div>
        {mensagensNaoLidas > 0 && (
          <Badge variant="destructive" className="absolute top-2 right-2 rounded-full text-xs min-w-[1.25rem] h-5 flex items-center justify-center">
            {mensagensNaoLidas}
          </Badge>
        )}
      </CardContent>
    </Card>
  );
};