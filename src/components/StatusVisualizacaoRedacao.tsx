import { useVisualizacoesRealtime } from '@/hooks/useVisualizacoesRealtime';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CheckCircle2, Clock } from 'lucide-react';

interface StatusVisualizacaoProps {
  redacaoId: string;
  emailAluno: string;
  className?: string;
}

export function StatusVisualizacaoRedacao({ 
  redacaoId, 
  emailAluno, 
  className = "" 
}: StatusVisualizacaoProps) {
  const { isRedacaoVisualizada, getVisualizacao } = useVisualizacoesRealtime();
  
  const visualizada = isRedacaoVisualizada(redacaoId, emailAluno);
  const visualizacao = getVisualizacao(redacaoId, emailAluno);

  if (visualizada && visualizacao) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          Ciente
        </Badge>
        <span className="text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(visualizacao.visualizado_em), {
            addSuffix: true,
            locale: ptBR
          })}
        </span>
      </div>
    );
  }

  return (
    <Badge variant="outline" className={`bg-orange-50 text-orange-700 border-orange-200 ${className}`}>
      <Clock className="w-3 h-3 mr-1" />
      Não visualizada
    </Badge>
  );
}