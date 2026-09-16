import { useEffect, useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Inbox, ArrowRight } from "lucide-react";
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
      const interval = setInterval(fetchMensagensNaoLidas, 30000);
      return () => clearInterval(interval);
    }
  }, [corretor?.email]);

  return (
    <Card
      className="bg-white border-0 ring-1 ring-violet-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => navigate('/corretor/ajuda-rapida')}
    >
      <CardContent className="flex items-center gap-4 p-5">
        <div className="bg-violet-100 p-3 rounded-xl shrink-0">
          <Inbox className="w-5 h-5 text-violet-600" />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-slate-800 text-sm">Recados dos Alunos</p>
          <p className="text-xs text-slate-500">Mensagens dos seus alunos</p>
        </div>
        {mensagensNaoLidas > 0 ? (
          <Badge variant="destructive" className="rounded-full shrink-0">
            {mensagensNaoLidas}
          </Badge>
        ) : (
          <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
        )}
      </CardContent>
    </Card>
  );
};