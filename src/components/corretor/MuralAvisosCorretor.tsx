
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Calendar, ExternalLink } from "lucide-react";

interface AvisoCorretor {
  id: string;
  titulo: string;
  descricao: string;
  prioridade: string;
  criado_em: string;
  imagem_url: string | null;
  link_externo: string | null;
}

interface MuralAvisosCorretorProps {
  corretorId: string;
}

export const MuralAvisosCorretor = ({ corretorId }: MuralAvisosCorretorProps) => {
  const [avisos, setAvisos] = useState<AvisoCorretor[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchAvisos();
  }, [corretorId]);

  const fetchAvisos = async () => {
    try {
      const { data, error } = await supabase
        .rpc('get_avisos_corretor', {
          corretor_id_param: corretorId
        });

      if (error) throw error;

      setAvisos(data || []);
    } catch (error: any) {
      console.error("Erro ao buscar avisos:", error);
      toast({
        title: "Erro ao carregar avisos",
        description: error.message || "Ocorreu um erro inesperado.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getPrioridadeVariant = (prioridade: string) => {
    switch (prioridade) {
      case 'alta': return 'destructive';
      case 'media': return 'default';
      case 'baixa': return 'secondary';
      default: return 'outline';
    }
  };

  if (loading) {
    return <div>Carregando avisos...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          📢 Mural de Avisos
          <Badge variant="secondary">{avisos.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {avisos.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">
            Nenhum aviso disponível no momento.
          </p>
        ) : (
          <div className="space-y-4">
            {avisos.map((aviso) => (
              <div key={aviso.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-lg">{aviso.titulo}</h3>
                  <Badge variant={getPrioridadeVariant(aviso.prioridade)}>
                    {aviso.prioridade}
                  </Badge>
                </div>
                
                <p className="text-muted-foreground mb-3">{aviso.descricao}</p>
                
                {aviso.imagem_url && (
                  <img 
                    src={aviso.imagem_url} 
                    alt="Imagem do aviso" 
                    className="w-full max-w-md h-auto rounded-md mb-3"
                  />
                )}
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    {new Date(aviso.criado_em).toLocaleDateString('pt-BR')}
                  </div>
                  
                  {aviso.link_externo && (
                    <a 
                      href={aviso.link_externo} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-sm text-primary hover:underline"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Ver mais
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
