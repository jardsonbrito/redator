import { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Download, Eye, Calendar, Lock } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';

export interface BadgeType {
  label: string;
  variant?: 'default' | 'secondary' | 'destructive' | 'outline';
  icon?: ReactNode;
}

interface StudentBibliotecaCardProps {
  title: string;
  description?: string;
  coverUrl?: string;
  coverAlt: string;
  categoria: string;
  publishedAt?: string;
  unpublishedAt?: string;
  isLivroDigital?: boolean;
  podeAcessar: boolean;
  onViewPdf: () => void;
  className?: string;
}

export const StudentBibliotecaCard = ({
  title,
  description,
  coverUrl,
  coverAlt,
  categoria,
  publishedAt,
  unpublishedAt,
  isLivroDigital = false,
  podeAcessar,
  onViewPdf,
  className = ''
}: StudentBibliotecaCardProps) => {
  
  // Calcular se está dentro do período de disponibilidade
  const now = new Date();
  const unpublishedDate = unpublishedAt ? new Date(unpublishedAt) : null;
  
  // Simplificando: se tem permissão e não expirou, está disponível
  const isExpired = unpublishedDate && now >= unpublishedDate;
  const isAvailable = !isExpired && podeAcessar;

  console.log(`[CARD] ${title}:`, {
    publishedAt,
    unpublishedAt,
    now: now.toISOString(),
    isExpired,
    podeAcessar,
    isAvailable
  });

  // Preparar badges
  const badges: BadgeType[] = [
    {
      label: categoria,
      variant: 'outline'
    }
  ];

  // Badge de data de publicação
  if (publishedAt) {
    badges.push({
      label: format(new Date(publishedAt), "dd/MM/yyyy", { locale: ptBR }),
      variant: 'outline',
      icon: <Calendar className="w-3 h-3" />
    });
  }

  // Badge "Disponível até" se tiver data de despublicação e não estiver expirado
  if (unpublishedDate && !isExpired) {
    badges.push({
      label: `Disponível até ${format(unpublishedDate, "dd/MM/yyyy", { locale: ptBR })}`,
      variant: 'secondary'
    });
  }

  return (
    <Card className={`border-redator-accent/20 overflow-hidden ${!isAvailable ? 'opacity-60' : ''} ${className}`}>
      <div className="flex flex-col sm:flex-row">
        {/* Cover/Thumbnail */}
        <div className="w-full sm:w-48 h-32 sm:h-auto overflow-hidden bg-muted flex-shrink-0">
          {coverUrl ? (
            <img 
              src={coverUrl} 
              alt={coverAlt}
              className="w-full h-full object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = '/placeholders/aula-cover.png';
                target.onerror = () => {
                  const parent = target.parentElement;
                  if (parent) {
                    parent.innerHTML = '<div class="w-full h-full bg-muted flex items-center justify-center"><span class="text-xs text-muted-foreground">Sem imagem</span></div>';
                  }
                };
              }}
            />
          ) : (
            <div className="w-full h-full bg-muted flex items-center justify-center">
              <span className="text-xs text-muted-foreground">Sem imagem</span>
            </div>
          )}
        </div>
        
        {/* Content */}
        <div className="flex-1 flex flex-col">
          <CardContent className="p-4 flex-1">
            {/* Title */}
            <h3 className="font-semibold text-redator-primary line-clamp-2 mb-2 text-lg flex items-center gap-2">
              {title}
              {!podeAcessar && <Lock className="w-4 h-4 text-gray-400" />}
            </h3>
            
            {/* Description */}
            {description && (
              <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                {description}
              </p>
            )}
            
            {/* Badges */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
              {badges.map((badge, index) => (
                <Badge 
                  key={index}
                  variant={badge.variant || 'outline'} 
                  className="text-xs flex items-center gap-1"
                >
                  {badge.icon}
                  {badge.label}
                </Badge>
              ))}
            </div>
            
            {/* Action Button */}
            <div className="mt-auto">
              {!podeAcessar ? (
                <div className="text-center text-sm text-gray-500">
                  <Lock className="w-5 h-5 mx-auto mb-1 text-gray-400" />
                  Disponível apenas para alunos
                </div>
              ) : isExpired ? (
                <div className="text-center text-sm text-red-500">
                  Material não está mais disponível
                </div>
              ) : (
                <Button
                  onClick={onViewPdf}
                  className={`w-full ${
                    isLivroDigital 
                      ? "bg-emerald-500 hover:bg-emerald-600" 
                      : "bg-redator-primary hover:bg-redator-secondary"
                  }`}
                  disabled={!isAvailable}
                >
                  {isLivroDigital ? (
                    <>
                      <Eye className="w-4 h-4 mr-2" />
                      Ler agora
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      Baixar PDF
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </div>
      </div>
    </Card>
  );
};