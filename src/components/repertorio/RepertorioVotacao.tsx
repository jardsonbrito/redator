import { ThumbsUp, ThumbsDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { VotosResumo } from "@/hooks/useRepertorio";

interface RepertorioVotacaoProps {
  votosResumo: VotosResumo;
  votoUsuario?: 'produtivo' | 'nao_produtivo' | null;
  onVotar: (voto: 'produtivo' | 'nao_produtivo') => void;
  isVotando?: boolean;
  podeVotar?: boolean;
  isPropriaPublicacao?: boolean;
}

export const RepertorioVotacao = ({
  votosResumo,
  votoUsuario,
  onVotar,
  isVotando = false,
  podeVotar = true,
  isPropriaPublicacao = false,
}: RepertorioVotacaoProps) => {
  const { total, produtivos, nao_produtivos, percentual_produtivo } = votosResumo;

  // Cor do termômetro baseada no percentual
  const getTermometroColor = () => {
    if (total === 0) return 'bg-gray-200';
    if (percentual_produtivo >= 70) return 'bg-green-500';
    if (percentual_produtivo >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-3">
      {/* Termômetro visual */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Termômetro de Produtividade</span>
          <span className="font-medium">
            {total > 0 ? `${percentual_produtivo}% produtivo` : 'Sem votos'}
            {total > 0 && ` (${total} ${total === 1 ? 'voto' : 'votos'})`}
          </span>
        </div>
        <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full transition-all duration-500 rounded-full",
              getTermometroColor()
            )}
            style={{ width: total > 0 ? `${percentual_produtivo}%` : '0%' }}
          />
        </div>
        {total > 0 && (
          <div className="flex justify-between text-xs text-muted-foreground">
            <span className="text-green-600">{produtivos} produtivo{produtivos !== 1 ? 's' : ''}</span>
            <span className="text-red-600">{nao_produtivos} improdutivo{nao_produtivos !== 1 ? 's' : ''}</span>
          </div>
        )}
      </div>

      {/* Botões de votação */}
      {podeVotar && !isPropriaPublicacao && (
        <div className="flex gap-2">
          <Button
            variant={votoUsuario === 'produtivo' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onVotar('produtivo')}
            disabled={isVotando}
            className={cn(
              "flex-1 gap-2",
              votoUsuario === 'produtivo' && "bg-green-600 hover:bg-green-700"
            )}
          >
            <ThumbsUp className="h-4 w-4" />
            Produtivo
          </Button>
          <Button
            variant={votoUsuario === 'nao_produtivo' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onVotar('nao_produtivo')}
            disabled={isVotando}
            className={cn(
              "flex-1 gap-2",
              votoUsuario === 'nao_produtivo' && "bg-red-600 hover:bg-red-700"
            )}
          >
            <ThumbsDown className="h-4 w-4" />
            Improdutivo
          </Button>
        </div>
      )}

      {isPropriaPublicacao && (
        <p className="text-xs text-muted-foreground text-center italic">
          Você não pode votar na sua própria publicação
        </p>
      )}

      {!podeVotar && !isPropriaPublicacao && (
        <p className="text-xs text-muted-foreground text-center italic">
          Faça login para votar
        </p>
      )}
    </div>
  );
};
