import { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getTemaCoverUrl } from '@/utils/temaImageUtils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CheckCircle, Clock, X, AlertTriangle } from 'lucide-react';

export interface RedacaoCardData {
  id: string;
  frase_tematica: string;
  eixo_tematico?: string;
  status: string;
  corrigida: boolean;
  data_envio: string;
  data_correcao?: string | null;
  corretor?: string;
  nota_total?: number | null;
  imagem_url?: string;
  video_url?: string;
  redacao_manuscrita_url?: string | null;
  tipo_envio?: string; // Para identificar tema livre
  // Campos do tema para buscar imagem
  tema?: {
    cover_url?: string;
    cover_source?: string;
    cover_file_path?: string;
    motivator4_url?: string;
    motivator4_source?: string;
    motivator4_file_path?: string;
    imagem_texto_4_url?: string;
    eixo_tematico: string;
  };
}

interface RedacaoCardActions {
  onVerRedacao?: (id: string) => void;
  onCancelarEnvio?: (id: string) => void;
}

interface RedacaoCardProps {
  redacao: RedacaoCardData;
  actions: RedacaoCardActions;
  className?: string;
}

const getStatusInfo = (redacao: RedacaoCardData) => {
  if (redacao.status === 'devolvida') {
    return {
      label: 'Devolvida',
      variant: 'destructive' as const,
      bgColor: 'bg-red-600',
      icon: <AlertTriangle className="w-3 h-3" />
    };
  }

  if (redacao.corrigida || redacao.status === 'corrigida') {
    return {
      label: 'Corrigida',
      variant: 'default' as const,
      bgColor: 'bg-green-600',
      icon: <CheckCircle className="w-3 h-3" />
    };
  }

  return {
    label: 'Aguardando Correção',
    variant: 'secondary' as const,
    bgColor: 'bg-yellow-500',
    icon: <Clock className="w-3 h-3" />
  };
};

const getImageUrl = (redacao: RedacaoCardData): string => {
  // Se tem tema associado, usar a imagem do tema
  if (redacao.tema) {
    return getTemaCoverUrl(redacao.tema);
  }

  // Fallback para imagem padrão
  return '/lovable-uploads/66db3418-766f-47b9-836b-07a6a228a79c.png';
};

const getEixoTematico = (redacao: RedacaoCardData): string => {
  return redacao.tema?.eixo_tematico || redacao.eixo_tematico || 'Sem eixo';
};

const isTemaLivre = (redacao: RedacaoCardData): boolean => {
  return redacao.tipo_envio === 'tema_livre' || (!redacao.tema && !redacao.eixo_tematico);
};

export const RedacaoCard = ({ redacao, actions, className = '' }: RedacaoCardProps) => {
  const statusInfo = getStatusInfo(redacao);
  const imageUrl = getImageUrl(redacao);
  const eixoTematico = getEixoTematico(redacao);
  const corrigida = redacao.corrigida || redacao.status === 'corrigida';
  const isTempoLivre = isTemaLivre(redacao);

  return (
    <Card className={`bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-all duration-300 border-gray-200 flex flex-col h-full ${className}`}>
      {/* Imagem + badges - apenas se não for tema livre */}
      {!isTempoLivre ? (
        <div className="relative">
          <div className="w-full h-40 sm:h-44 md:h-40 overflow-hidden">
            <img
              src={imageUrl}
              alt={`Tema: ${redacao.frase_tematica}`}
              className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = '/lovable-uploads/66db3418-766f-47b9-836b-07a6a228a79c.png';
              }}
            />
          </div>

          {/* Badge do eixo temático */}
          <Badge className="absolute top-2 left-2 bg-green-500 hover:bg-green-600 text-white text-xs px-2 py-1 shadow-sm">
            {eixoTematico}
          </Badge>
        </div>
      ) : (
        /* Para tema livre, mostrar um espaço em branco ou uma indicação visual mais sutil */
        <div className="w-full h-4 bg-gradient-to-r from-blue-50 to-purple-50 border-b border-gray-100"></div>
      )}

      {/* Conteúdo */}
      <div className="p-4 flex-1 flex flex-col">
        {/* Título */}
        <h3 className="text-sm sm:text-base font-semibold text-gray-900 line-clamp-3 mb-3 leading-tight">
          {redacao.frase_tematica}
        </h3>

        {/* Metadados */}
        <div className="space-y-2 mb-4">
          {/* Data/hora de envio */}
          <div className="text-xs text-gray-600">
            <span className="font-medium">Enviado:</span>{' '}
            {format(new Date(redacao.data_envio), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          </div>

          {/* Data/hora da correção (se já corrigida) */}
          {corrigida && redacao.data_correcao && (
            <div className="text-xs text-gray-600">
              <span className="font-medium">Corrigido:</span>{' '}
              {format(new Date(redacao.data_correcao), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </div>
          )}

          {/* Nome do corretor */}
          {redacao.corretor && (
            <div className="text-xs text-gray-600">
              <span className="font-medium">Corretor:</span> {redacao.corretor}
            </div>
          )}
        </div>

        {/* Nota (se já corrigida) */}
        {corrigida && redacao.nota_total && (
          <div className="mb-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="text-center">
                <div className="text-sm font-medium text-blue-800 mb-1">Sua Nota</div>
                <div className="text-2xl font-bold text-blue-900">{redacao.nota_total}</div>
              </div>
            </div>
          </div>
        )}

        <div className="flex-1"></div>

        {/* Status Badge */}
        <div className="mb-3">
          <Badge className={`${statusInfo.bgColor} text-white text-xs px-2 py-1 flex items-center gap-1 w-fit`}>
            {statusInfo.icon}
            {statusInfo.label}
          </Badge>
        </div>

        {/* Botões de ação */}
        <div className="space-y-2">
          {!corrigida ? (
            <>
              {/* Não corrigida - Botão azul e vermelho */}
              <Button
                onClick={() => actions.onVerRedacao?.(redacao.id)}
                className="w-full bg-blue-600 text-white py-2.5 px-4 rounded-lg text-sm font-medium hover:bg-blue-700 transition-all duration-200 shadow-sm hover:shadow-md"
              >
                Ver Minha Redação
              </Button>
              <Button
                onClick={() => actions.onCancelarEnvio?.(redacao.id)}
                variant="destructive"
                className="w-full py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-200 shadow-sm hover:shadow-md"
              >
                <X className="w-4 h-4 mr-2" />
                Cancelar Envio
              </Button>
            </>
          ) : (
            <>
              {/* Corrigida - Só botão verde */}
              <Button
                onClick={() => actions.onVerRedacao?.(redacao.id)}
                className="w-full bg-green-600 text-white py-2.5 px-4 rounded-lg text-sm font-medium hover:bg-green-700 transition-all duration-200 shadow-sm hover:shadow-md"
              >
                Ver Minha Redação
              </Button>
            </>
          )}
        </div>
      </div>
    </Card>
  );
};