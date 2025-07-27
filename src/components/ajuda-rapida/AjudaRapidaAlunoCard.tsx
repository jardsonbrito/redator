import { useEffect, useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAjudaRapida } from "@/hooks/useAjudaRapida";
import { useStudentAuth } from "@/hooks/useStudentAuth";

export const AjudaRapidaAlunoCard = () => {
  const navigate = useNavigate();
  const { buscarMensagensNaoLidasAluno } = useAjudaRapida();
  const { studentData } = useStudentAuth();
  const [mensagensNaoLidas, setMensagensNaoLidas] = useState(0);

  useEffect(() => {
    console.log('🔔 AjudaRapidaAlunoCard - studentData.email:', studentData?.email);
    if (studentData?.email) {
      const fetchMensagensNaoLidas = async () => {
        console.log('🔔 Buscando mensagens não lidas para:', studentData.email);
        const count = await buscarMensagensNaoLidasAluno(studentData.email);
        console.log('🔔 Resultado da busca:', count);
        setMensagensNaoLidas(count);
      };
      
      fetchMensagensNaoLidas();
      
      // Atualizar a cada 30 segundos
      const interval = setInterval(fetchMensagensNaoLidas, 30000);
      
      // Escutar evento customizado de mensagens lidas
      const handleMensagensLidas = () => {
        fetchMensagensNaoLidas();
      };
      
      window.addEventListener('mensagensLidas', handleMensagensLidas);
      
      return () => {
        clearInterval(interval);
        window.removeEventListener('mensagensLidas', handleMensagensLidas);
      };
    }
  }, [studentData?.email, buscarMensagensNaoLidasAluno]);

  return (
    <Card 
      className="bg-white hover:shadow-md transition-all duration-200 cursor-pointer border-l-4 border-l-primary relative"
      onClick={() => navigate('/ajuda-rapida')}
    >
      {/* Badge de notificação no canto superior direito */}
      {mensagensNaoLidas > 0 && (
        <div className="absolute -top-2 -right-2 z-10">
          <Badge 
            variant="destructive" 
            className="rounded-full min-w-[24px] h-6 flex items-center justify-center text-xs font-bold bg-red-500 text-white border-2 border-white shadow-lg"
          >
            {mensagensNaoLidas}
          </Badge>
        </div>
      )}
      
      <CardContent className="flex items-center justify-between p-6">
        <div className="flex items-center space-x-4">
          <div className="bg-primary/10 p-3 rounded-lg">
            <MessageCircle className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-lg text-foreground">Ajuda Rápida</h3>
            <p className="text-sm text-muted-foreground">
              Converse com seus corretores
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <MessageCircle className="w-5 h-5 text-primary" />
        </div>
      </CardContent>
    </Card>
  );
};