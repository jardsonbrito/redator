import React from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Clock, Users, CheckCircle, AlertCircle, RotateCcw, Star } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface LousaCardProps {
  lousa: {
    id: string;
    titulo: string;
    enunciado: string;
    inicio_em: string | null;
    fim_em: string | null;
    turmas: string[];
    permite_visitante: boolean;
    capa_url: string | null;
    resposta?: {
      status: string;
      nota: number | null;
      comentario_professor: string | null;
      submitted_at: string | null;
    } | null;
  };
  onClick: () => void;
}

export default function LousaCard({ lousa, onClick }: LousaCardProps) {
  const getStatusInfo = () => {
    if (!lousa.resposta) {
      return {
        label: 'Aberta',
        icon: AlertCircle,
        variant: 'default' as const,
        action: 'Responder'
      };
    }

    switch (lousa.resposta.status) {
      case 'submitted':
        return {
          label: 'Enviada',
          icon: CheckCircle,
          variant: 'secondary' as const,
          action: 'Ver envio'
        };
      case 'returned':
        return {
          label: 'Devolvida',
          icon: RotateCcw,
          variant: 'destructive' as const,
          action: 'Rever e reenviar'
        };
      case 'graded':
        return {
          label: 'Corrigida',
          icon: Star,
          variant: 'default' as const,
          action: 'Ver feedback'
        };
      default:
        return {
          label: 'Rascunho',
          icon: AlertCircle,
          variant: 'outline' as const,
          action: 'Continuar'
        };
    }
  };

  const isAvailable = () => {
    const now = new Date();
    const inicio = lousa.inicio_em ? new Date(lousa.inicio_em) : null;
    const fim = lousa.fim_em ? new Date(lousa.fim_em) : null;

    if (inicio && now < inicio) return false;
    if (fim && now > fim) return false;
    
    return true;
  };

  const getPeriodText = () => {
    if (!lousa.inicio_em && !lousa.fim_em) {
      return 'Disponível agora';
    }

    const formatDate = (date: string) => 
      format(new Date(date), 'dd/MM/yyyy HH:mm', { locale: ptBR });

    if (lousa.inicio_em && lousa.fim_em) {
      return `${formatDate(lousa.inicio_em)} - ${formatDate(lousa.fim_em)}`;
    }

    if (lousa.inicio_em) {
      return `A partir de ${formatDate(lousa.inicio_em)}`;
    }

    if (lousa.fim_em) {
      return `Até ${formatDate(lousa.fim_em)}`;
    }

    return 'Disponível agora';
  };

  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.icon;
  const available = isAvailable();

  return (
    <Card className={cn(
      "cursor-pointer transition-all duration-200 hover:shadow-lg",
      !available && "opacity-60"
    )}>
      <CardContent className="p-6">
        {lousa.capa_url && (
          <div className="w-full h-32 mb-4 rounded-lg overflow-hidden bg-muted">
            <img 
              src={lousa.capa_url} 
              alt={lousa.titulo}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <div className="space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="font-semibold text-lg mb-2">{lousa.titulo}</h3>
              <p className="text-sm text-muted-foreground line-clamp-3">
                {lousa.enunciado}
              </p>
            </div>
            <Badge variant={statusInfo.variant} className="ml-3">
              <StatusIcon className="w-3 h-3 mr-1" />
              {statusInfo.label}
            </Badge>
          </div>

          {/* Nota se corrigida */}
          {lousa.resposta?.status === 'graded' && lousa.resposta.nota !== null && (
            <div className="flex items-center gap-2 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <Star className="w-4 h-4 text-yellow-600" />
              <span className="text-sm font-medium text-yellow-800">
                Nota: {lousa.resposta.nota}/10
              </span>
            </div>
          )}

          {/* Informações adicionais */}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {getPeriodText()}
            </div>

            <div className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              {lousa.turmas.length > 0 
                ? lousa.turmas.map(t => `Turma ${t}`).join(', ')
                : 'Geral'
              }
              {lousa.permite_visitante && (
                <Badge variant="outline" className="ml-1 text-xs">Visitantes</Badge>
              )}
            </div>
          </div>

          {/* Data de envio se disponível */}
          {lousa.resposta?.submitted_at && (
            <div className="text-xs text-muted-foreground">
              Enviado em {format(new Date(lousa.resposta.submitted_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
            </div>
          )}

          <Button 
            onClick={onClick}
            className="w-full"
            disabled={!available && !lousa.resposta}
          >
            {available || lousa.resposta ? statusInfo.action : 'Indisponível'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}