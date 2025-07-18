import { useEffect, useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Inbox } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAjudaRapida } from "@/hooks/useAjudaRapida";
import { useCorretorAuth } from "@/hooks/useCorretorAuth";

export const AjudaRapidaCorretorCard = () => {
  const navigate = useNavigate();
  const { buscarMensagensNaoLidas } = useAjudaRapida();
  const { corretor } = useCorretorAuth();
  const [mensagensNaoLidas, setMensagensNaoLidas] = useState(0);

  useEffect(() => {
    if (corretor?.email) {
      const fetchMensagensNaoLidas = async () => {
        const count = await buscarMensagensNaoLidas(corretor.email);
        setMensagensNaoLidas(count);
      };
      
      fetchMensagensNaoLidas();
      
      // Atualizar a cada 30 segundos
      const interval = setInterval(fetchMensagensNaoLidas, 30000);
      return () => clearInterval(interval);
    }
  }, [corretor?.email]);

  return (
    <Card 
      className="bg-white hover:shadow-md transition-all duration-200 cursor-pointer border-l-4 border-l-primary"
      onClick={() => navigate('/corretor/ajuda-rapida')}
    >
      <CardContent className="flex items-center justify-between p-6">
        <div className="flex items-center space-x-4">
          <div className="bg-primary/10 p-3 rounded-lg">
            <Inbox className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-lg text-foreground">Recados dos Alunos</h3>
            <p className="text-sm text-muted-foreground">
              Mensagens dos seus alunos
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {mensagensNaoLidas > 0 && (
            <Badge variant="destructive" className="rounded-full">
              {mensagensNaoLidas}
            </Badge>
          )}
          <Inbox className="w-5 h-5 text-primary" />
        </div>
      </CardContent>
    </Card>
  );
};