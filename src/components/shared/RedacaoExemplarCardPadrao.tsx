import React from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MoreHorizontal, ExternalLink, Edit, Trash2, User } from 'lucide-react';
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

interface RedacaoExemplarCardData {
  id: string;
  frase_tematica: string;
  eixo_tematico?: string;
  conteudo?: string;
  texto?: string;
  data_envio?: string;
  autor?: string;
  foto_autor?: string;
  pdf_url?: string;
  imagem_url?: string;
  dica_de_escrita?: string;
  data_agendamento?: string | null;
  // Campos para agendamento/publicação programada (legado)
  data_publicacao?: string | null;
  programada?: boolean;
}

interface RedacaoExemplarCardActions {
  onEditar?: (id: string) => void;
  onExcluir?: (id: string) => void;
}

interface RedacaoExemplarCardPadraoProps {
  redacao: RedacaoExemplarCardData;
  perfil: 'aluno' | 'admin' | 'corretor';
  actions?: RedacaoExemplarCardActions;
}

export const RedacaoExemplarCardPadrao = ({
  redacao,
  perfil,
  actions
}: RedacaoExemplarCardPadraoProps) => {
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = React.useState(false);



  const getCoverImage = () => {
    // Priorizar imagem_url, depois pdf_url, depois placeholder
    if (redacao.imagem_url) return redacao.imagem_url;
    if (redacao.pdf_url) return redacao.pdf_url;
    return "/placeholders/aula-cover.png";
  };

  const getEixoBadge = () => {
    if (!redacao.eixo_tematico) return null;

    return (
      <Badge className="text-xs bg-purple-100 text-purple-700">
        {redacao.eixo_tematico}
      </Badge>
    );
  };

  const getAutorName = () => {
    return redacao.autor || "";
  };

  const formatCreatedDate = () => {
    try {
      if (!redacao.data_envio) return null;
      const date = new Date(redacao.data_envio);
      return format(date, 'dd/MM/yyyy', { locale: ptBR });
    } catch {
      return null;
    }
  };

  // Verificar se a redação deve ser exibida (para publicação programada)
  const shouldShowRedacao = () => {
    if (perfil === 'admin') return true; // Admin sempre vê tudo

    // Verificar agendamento atual (data_agendamento)
    if (redacao.data_agendamento) {
      const now = new Date();
      const scheduledDate = new Date(redacao.data_agendamento);
      return now >= scheduledDate;
    }

    // Verificar agendamento legado (data_publicacao) para compatibilidade
    if (redacao.data_publicacao) {
      const now = new Date();
      const publicationDate = new Date(redacao.data_publicacao);
      return now >= publicationDate;
    }

    return true; // Sem agendamento, sempre visível
  };

  // Verificar se está agendada (para admins verem o status)
  const isScheduled = () => {
    if (!redacao.data_agendamento) return false;
    const now = new Date();
    const scheduledDate = new Date(redacao.data_agendamento);
    return now < scheduledDate;
  };

  const formatScheduledDate = () => {
    try {
      if (!redacao.data_agendamento) return null;
      const date = new Date(redacao.data_agendamento);
      return format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    } catch {
      return null;
    }
  };

  if (!shouldShowRedacao()) return null;

  const handleViewRedacao = () => {
    if (perfil === 'corretor') {
      navigate(`/corretor/redacoes-exemplar/${redacao.id}`);
    } else {
      // Admin e aluno usam a mesma rota
      navigate(`/redacoes-exemplar/${redacao.id}`);
    }
  };

  return (
    <Card className="overflow-hidden shadow-md rounded-2xl border border-gray-200 bg-white">
      {/* Capa - Always on top with 16:9 ratio */}
      <div className="aspect-[16/9] overflow-hidden bg-gradient-to-br from-purple-100 to-purple-200 relative">
        <img
          src={getCoverImage()}
          alt={`Capa da redação: ${redacao.frase_tematica}`}
          className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
          onError={(e) => {
            e.currentTarget.src = "/placeholders/aula-cover.png";
          }}
          loading="lazy"
        />

        {/* Badge do eixo temático na imagem */}
        {getEixoBadge() && (
          <div className="absolute top-2 left-2">
            {getEixoBadge()}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-6">
        <div className="space-y-4">
          {/* Cabeçalho */}
          <div className="flex justify-between items-start gap-3">
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-semibold text-gray-900 leading-tight mb-1">
                {redacao.frase_tematica}
              </h2>

              {/* Autor */}
              {getAutorName() && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                  {/* Usar foto real do banco ou fallback */}
                  {redacao.foto_autor ? (
                    <img
                      src={redacao.foto_autor}
                      alt={getAutorName()}
                      className="w-8 h-8 rounded-full border border-gray-200 object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
                      <User className="h-4 w-4 text-white" aria-hidden="true" />
                    </div>
                  )}
                  <span>Por: <strong>{getAutorName()}</strong></span>
                </div>
              )}
            </div>

            {/* Menu três pontinhos apenas para admin */}
            {perfil === 'admin' && (
              <div className="flex-shrink-0">
                <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full bg-gray-100 hover:bg-gray-200">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => {
                      setDropdownOpen(false);
                      actions?.onEditar?.(redacao.id);
                    }}>
                      <Edit className="mr-2 h-4 w-4" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => {
                      setDropdownOpen(false);
                      actions?.onExcluir?.(redacao.id);
                    }} className="text-red-600">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>

          {/* Data de criação (só para admin) */}
          {perfil === 'admin' && formatCreatedDate() && (
            <div className="text-sm text-gray-500">
              <span>Criado em: {formatCreatedDate()}</span>
            </div>
          )}

          {/* Status de agendamento (só para admin) */}
          {perfil === 'admin' && isScheduled() && (
            <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
                <div className="text-sm">
                  <span className="font-medium text-amber-800">📅 Agendada para: </span>
                  <span className="text-amber-700">{formatScheduledDate()}</span>
                </div>
              </div>
              <p className="text-xs text-amber-600 mt-1">
                Esta redação será publicada automaticamente na data programada
              </p>
            </div>
          )}


          {/* Ações */}
          <div className="pt-2">
            <Button
              className="w-full font-semibold bg-green-600 hover:bg-green-700 text-white"
              onClick={handleViewRedacao}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Ver Redação
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};