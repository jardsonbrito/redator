import React from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MoreHorizontal, ExternalLink, FileText, BarChart3, Edit, Power, PowerOff, Trash2, GraduationCap } from 'lucide-react';
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
import { supabase } from '@/integrations/supabase/client';

interface AulaGravadaCardData {
  id: string;
  titulo: string;
  descricao?: string;
  modulo: string;
  link_conteudo: string;
  pdf_url?: string;
  pdf_nome?: string;
  turmas_autorizadas: string[] | null;
  permite_visitante: boolean;
  ativo: boolean;
  criado_em: string;
  // Video metadata fields
  video_thumbnail_url?: string | null;
  platform?: string | null;
  video_id?: string | null;
  embed_url?: string | null;
  video_url_original?: string | null;
  cover_source?: string | null;
  cover_file_path?: string | null;
  cover_url?: string | null;
}

interface AulaGravadaCardActions {
  onAssistir?: (id: string) => void;
  onBaixarPdf?: (id: string) => void;
  onEditar?: (id: string) => void;
  onDesativar?: (id: string) => void;
  onExcluir?: (id: string) => void;
}

interface AulaGravadaCardPadraoProps {
  aula: AulaGravadaCardData;
  perfil: 'aluno' | 'admin' | 'corretor';
  actions?: AulaGravadaCardActions;
  isWatched?: boolean; // Para mostrar badge "Assistida"
}

export const AulaGravadaCardPadrao = ({
  aula,
  perfil,
  actions,
  isWatched = false
}: AulaGravadaCardPadraoProps) => {

  const getCoverImage = () => {
    // Prioritizar cover específico, depois thumbnail do vídeo, depois placeholder
    if (aula.cover_url) return aula.cover_url;

    // Se houver cover_file_path, gerar URL pública do storage
    if (aula.cover_file_path) {
      const { data } = supabase.storage
        .from('aulas')
        .getPublicUrl(aula.cover_file_path);

      // Add cache busting if we have creation timestamp
      const cacheBuster = aula.criado_em ? `?v=${new Date(aula.criado_em).getTime()}` : '';
      return data.publicUrl + cacheBuster;
    }

    if (aula.video_thumbnail_url) return aula.video_thumbnail_url;
    return "/placeholders/aula-cover.png";
  };

  const getCompetenciaBadge = () => {
    if (!aula.modulo) return null;

    let badgeClass = "text-xs";
    if (aula.modulo === 'Aula ao vivo') {
      badgeClass += " bg-orange-100 text-orange-700";
    } else {
      badgeClass += " bg-purple-100 text-purple-700";
    }

    return (
      <Badge className={badgeClass}>
        {aula.modulo}
      </Badge>
    );
  };

  const getPlatformBadge = () => {
    if (!aula.platform) return null;

    return (
      <Badge className="text-xs bg-gray-100 text-gray-700">
        {aula.platform.toUpperCase()}
      </Badge>
    );
  };

  const getWatchedBadge = () => {
    if (!isWatched || perfil === 'admin') return null;

    return (
      <Badge className="text-xs bg-green-100 text-green-700">
        Assistida
      </Badge>
    );
  };

  const formatCreatedDate = () => {
    try {
      const date = new Date(aula.criado_em);
      return format(date, 'dd/MM/yyyy', { locale: ptBR });
    } catch {
      return 'Data não disponível';
    }
  };

  return (
    <Card className="overflow-hidden shadow-md rounded-2xl border border-gray-200 bg-white">
      {/* Capa - Always on top with 16:9 ratio */}
      <div className="aspect-[16/9] overflow-hidden bg-gradient-to-br from-purple-100 to-purple-200">
        <img
          src={getCoverImage()}
          alt={`Capa da aula: ${aula.titulo}`}
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
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-semibold text-gray-900 leading-tight mb-1">
                {aula.titulo}
              </h2>
              {aula.descricao && (
                <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                  {aula.descricao}
                </p>
              )}

              {/* Badges movidas para baixo do título e subtítulo */}
              <div className="flex flex-wrap items-center gap-2">
                {getCompetenciaBadge()}
                {getPlatformBadge()}
                {getWatchedBadge()}
              </div>
            </div>

            {/* Menu três pontinhos apenas para admin */}
            {perfil === 'admin' && (
              <div className="flex-shrink-0">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full bg-gray-100 hover:bg-gray-200">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => actions?.onEditar?.(aula.id)}>
                      <Edit className="mr-2 h-4 w-4" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => actions?.onDesativar?.(aula.id)}>
                      {aula.ativo ? (
                        <>
                          <PowerOff className="mr-2 h-4 w-4" />
                          Desativar
                        </>
                      ) : (
                        <>
                          <Power className="mr-2 h-4 w-4" />
                          Ativar
                        </>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => actions?.onExcluir?.(aula.id)} className="text-red-600">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>

          {/* Turmas autorizadas - apenas para admin */}
          {perfil === 'admin' && aula.turmas_autorizadas && aula.turmas_autorizadas.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <GraduationCap className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Turmas:</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {aula.turmas_autorizadas.slice(0, 3).map((turma, index) => (
                  <Badge key={index} variant="secondary" className="text-xs bg-purple-100 text-purple-700">
                    {turma}
                  </Badge>
                ))}
                {aula.turmas_autorizadas.length > 3 && (
                  <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-700">
                    +{aula.turmas_autorizadas.length - 3}
                  </Badge>
                )}
                {aula.permite_visitante && (
                  <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">
                    Visitantes
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Data de criação (só para admin) */}
          {perfil === 'admin' && (
            <div className="text-sm text-gray-500">
              <span>Criado em: {formatCreatedDate()}</span>
            </div>
          )}

          {/* Ações */}
          <div className="pt-2">
            {perfil === 'admin' && (
              <div className="space-y-2">
                <Button
                  className="w-full font-semibold bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => actions?.onAssistir?.(aula.id)}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Ver Aula
                </Button>

                {aula.pdf_url && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => actions?.onBaixarPdf?.(aula.id)}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Baixar PDF
                  </Button>
                )}
              </div>
            )}

            {(perfil === 'aluno' || perfil === 'corretor') && (
              <div className="space-y-2">
                <Button
                  className="w-full font-semibold bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => actions?.onAssistir?.(aula.id)}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Assistir
                </Button>

                {aula.pdf_url && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => actions?.onBaixarPdf?.(aula.id)}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Baixar PDF
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};