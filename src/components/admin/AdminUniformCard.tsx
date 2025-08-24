import { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { IconActionGroup } from '@/components/admin/IconActionGroup';

export interface BadgeType {
  label: string;
  variant?: 'default' | 'secondary' | 'destructive' | 'outline';
  icon?: ReactNode;
}

interface AdminUniformCardProps {
  title: string;
  coverUrl?: string;
  coverAlt: string;
  badges: BadgeType[];
  actions: ReactNode;
  metaInfo?: string;
  className?: string;
}

export const AdminUniformCard = ({
  title,
  coverUrl,
  coverAlt,
  badges,
  actions,
  metaInfo,
  className = ''
}: AdminUniformCardProps) => {
  return (
    <Card className={`border-redator-accent/20 overflow-hidden ${className}`}>
      <div className="flex flex-col sm:flex-row">
        {/* Cover/Thumbnail - sempre visível */}
        <div className="w-full sm:w-48 h-32 sm:h-auto overflow-hidden bg-muted flex-shrink-0">
          {coverUrl ? (
            <img 
              src={coverUrl} 
              alt={coverAlt}
              className="w-full h-full object-cover"
              onLoad={() => console.log('Image loaded successfully:', coverUrl)}
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                console.error('Failed to load image:', coverUrl);
                target.src = '/placeholders/aula-cover.png';
                target.onerror = () => {
                  // Se até o placeholder falhar, mostrar div vazia
                  target.style.display = 'none';
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
            <h3 className="font-semibold text-redator-primary line-clamp-2 mb-3 text-base">
              {title}
            </h3>
            
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

            {/* Meta info */}
            {metaInfo && (
              <p className="text-xs text-muted-foreground mb-4">
                {metaInfo}
              </p>
            )}
            
            {/* Actions - sempre na parte inferior, apenas ícones */}
            <div className="mt-auto">
              <div className="flex items-center gap-2 flex-wrap">
                {actions}
              </div>
            </div>
          </CardContent>
        </div>
      </div>
    </Card>
  );
};