import React from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Clock, Users, MoreHorizontal, MessageSquare, Eye, Trash2, Edit } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface LousaCardData {
  id: string;
  titulo: string;
  inicio_em: string | null;
  fim_em: string | null;
  turmas: string[];
  permite_visitante: boolean;
  capa_url: string | null;
  ativo: boolean;
  status?: string;
  respostas_count?: number;
  respostas_pendentes?: number;
}

interface LousaCardActions {
  onResponder?: (id: string) => void;
  onVerRespostas?: (id: string) => void;
  onEncerrar?: (id: string) => void;
  onDeletar?: (id: string) => void;
  onEditar?: (id: string) => void;
}

interface LousaCardPadraoProps {
  lousa: LousaCardData;
  perfil: 'aluno' | 'admin' | 'corretor';
  actions?: LousaCardActions;
}

export const LousaCardPadrao = ({ lousa, perfil, actions }: LousaCardPadraoProps) => {
  const getStatusBadge = () => {
    const now = new Date();
    const inicio = lousa.inicio_em ? new Date(lousa.inicio_em) : null;
    const fim = lousa.fim_em ? new Date(lousa.fim_em) : null;

    if (!lousa.ativo) {
      return <Badge className="bg-gray-100 text-gray-700 text-xs font-medium">Encerrada</Badge>;
    }

    if (perfil === 'admin') {
      if (inicio && now < inicio) {
        return <Badge className="bg-blue-100 text-blue-700 text-xs font-medium">Programada</Badge>;
      }
      if (fim && now > fim) {
        return <Badge className="bg-gray-100 text-gray-700 text-xs font-medium">Encerrada</Badge>;
      }
      return <Badge className="bg-green-100 text-green-700 text-xs font-medium">Publicada</Badge>;
    }

    // Para aluno e corretor
    if (inicio && now < inicio) {
      return <Badge className="bg-yellow-100 text-yellow-700 text-xs font-medium">Indisponível</Badge>;
    }
    if (fim && now > fim) {
      return <Badge className="bg-gray-100 text-gray-700 text-xs font-medium">Encerrada</Badge>;
    }
    return <Badge className="bg-green-100 text-green-700 text-xs font-medium">Aberta</Badge>;
  };

  const getPeriodText = () => {
    if (!lousa.inicio_em && !lousa.fim_em) {
      return 'Disponível agora';
    }

    const formatDateTime = (date: string) =>
      format(new Date(date), 'dd/MM/yyyy HH:mm', { locale: ptBR });

    if (lousa.inicio_em && lousa.fim_em) {
      return `${formatDateTime(lousa.inicio_em)} - ${formatDateTime(lousa.fim_em)}`;
    }

    if (lousa.inicio_em) {
      return `A partir de ${formatDateTime(lousa.inicio_em)}`;
    }

    if (lousa.fim_em) {
      return `Até ${formatDateTime(lousa.fim_em)}`;
    }

    return 'Disponível agora';
  };

  const isAvailable = () => {
    const now = new Date();
    const inicio = lousa.inicio_em ? new Date(lousa.inicio_em) : null;
    const fim = lousa.fim_em ? new Date(lousa.fim_em) : null;

    if (!lousa.ativo) return false;
    if (inicio && now < inicio) return false;
    if (fim && now > fim) return false;

    return true;
  };

  const getCoverImage = () => {
    return lousa.capa_url || "/placeholders/aula-cover.png";
  };

  const available = isAvailable();

  return (
    <Card className="overflow-hidden shadow-md rounded-2xl border border-gray-200 bg-white">
      {/* Capa - Always on top with 16:9 ratio */}
      <div className="aspect-[16/9] overflow-hidden bg-gradient-to-br from-purple-100 to-purple-200">
        <img
          src={getCoverImage()}
          alt={`Capa da lousa: ${lousa.titulo}`}
          className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
          onError={(e) => {
            e.currentTarget.src = "/placeholders/aula-cover.png";
          }}
          loading="lazy"
        />
      </div>

      {/* Content */}
      <div className="p-6">
        <div className="space-y-4">
          {/* Cabeçalho */}
          <div className="flex justify-between items-start gap-3">
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-gray-900 leading-tight mb-1">
                {lousa.titulo}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              {getStatusBadge()}
              {(perfil === 'admin' || perfil === 'corretor') && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => actions?.onEditar?.(lousa.id)}>
                      <Edit className="mr-2 h-4 w-4" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => actions?.onEncerrar?.(lousa.id)}>
                      <Eye className="mr-2 h-4 w-4" />
                      Encerrar
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => actions?.onDeletar?.(lousa.id)} className="text-red-600">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Deletar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>

          {/* Informações de período */}
          <div className="text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>{getPeriodText()}</span>
            </div>
          </div>

          {/* Turmas vinculadas */}
          {lousa.turmas && lousa.turmas.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Turmas:</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {lousa.turmas.map((turma, index) => (
                  <Badge key={index} variant="secondary" className="text-xs bg-purple-100 text-purple-700">
                    {turma}
                  </Badge>
                ))}
                {lousa.permite_visitante && (
                  <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">
                    Visitantes
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Ações */}
          <div className="pt-2">
            {perfil === 'aluno' && (
              <Button
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold"
                onClick={() => actions?.onResponder?.(lousa.id)}
                disabled={!available}
              >
                {available ? 'Responder' : 'Indisponível'}
              </Button>
            )}

            {(perfil === 'admin' || perfil === 'corretor') && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => actions?.onVerRespostas?.(lousa.id)}
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  {perfil === 'admin' ? 'Respostas' : 'Ver Respostas'}
                  {lousa.respostas_count && lousa.respostas_count > 0 && (
                    <span className="ml-1 text-gray-600">({lousa.respostas_count})</span>
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};