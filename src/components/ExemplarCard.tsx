import React, { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { User } from "lucide-react";
import { cn } from "@/lib/utils";
import { resolveExemplarCover } from "@/utils/coverUtils";

export interface ExemplarCardProps {
  id: string;
  titulo: string;
  eixo?: string;
  autorNome?: string;
  capaUrl?: string;
  onViewRedacao: () => void;
  variant?: "student";
  className?: string;
}

export function ExemplarCard({ 
  titulo, 
  eixo, 
  autorNome = "Jardson Brito", 
  capaUrl,
  onViewRedacao,
  className
}: ExemplarCardProps) {
  const [imageError, setImageError] = useState(false);
  
  const coverUrl = useMemo(() => {
    if (imageError) return '/src/assets/tema-cover-placeholder.png';
    return capaUrl || resolveExemplarCover({ pdf_url: capaUrl }) || '/src/assets/tema-cover-placeholder.png';
  }, [imageError, capaUrl]);

  return (
    <Card 
      className={cn(
        "group border rounded-2xl shadow-sm overflow-hidden",
        "bg-card transition-all duration-200",
        "hover:shadow-md hover:-translate-y-1",
        "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
        className
      )}
      role="listitem"
    >
      <CardContent className="p-0">
        {/* Imagem de capa - 16:9 ratio */}
        <div className="relative aspect-video overflow-hidden">
          <img
            src={coverUrl}
            alt={`Capa da redação: ${titulo}`}
            loading="lazy"
            width={400}
            height={225}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
            onError={() => setImageError(true)}
          />
        </div>

        {/* Conteúdo do card */}
        <div className="p-4 space-y-3">
          {/* Tag de eixo */}
          {eixo && (
            <div className="flex items-start">
              <Badge 
                variant="secondary" 
                className="bg-primary/10 text-primary text-xs px-2.5 py-1 rounded-full font-medium"
              >
                {eixo}
              </Badge>
            </div>
          )}

          {/* Título */}
          <h3 className="text-lg font-semibold leading-tight line-clamp-2 text-foreground">
            {titulo}
          </h3>

          {/* Autor */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <User className="h-4 w-4" aria-hidden="true" />
            <span>{autorNome}</span>
          </div>

          {/* Botão Ver Redação */}
          <Button
            onClick={onViewRedacao}
            className="w-full mt-4"
            size="sm"
            aria-label={`Ver redação exemplar: ${titulo}`}
          >
            Ver Redação
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}