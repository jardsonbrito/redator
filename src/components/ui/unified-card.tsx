import React, { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

export type BadgeTone = "primary" | "neutral" | "success" | "warning";
export type ActionTone = "danger" | "neutral";
export type CardVariant = "admin" | "corretor" | "aluno";

export type UnifiedCardItem = {
  coverUrl: string;
  title: string;
  subtitle?: string;
  badges?: { label: string; tone?: BadgeTone }[];
  meta?: { icon: LucideIcon; text: string }[];
  actions?: { icon: LucideIcon; label: string; onClick: () => void; tone?: ActionTone }[];
  cta?: { label: string; onClick: () => void; ariaLabel?: string };
  hrefTitle?: string;
  ariaLabel?: string;
  module?: string;
  id?: string;
};

const toneToVariant: Record<BadgeTone, { className?: string; variant?: "secondary" | "outline" }> = {
  primary: { variant: "secondary" },
  neutral: { variant: "outline" },
  success: { className: "bg-green-600 text-white" },
  warning: { className: "bg-yellow-600 text-white" },
};

interface UnifiedCardProps {
  variant: CardVariant;
  item: UnifiedCardItem;
}

export function UnifiedCard({ variant, item }: UnifiedCardProps) {
  const [broken, setBroken] = useState(false);
  const imgSrc = useMemo(() => (broken ? '/src/assets/tema-cover-placeholder.png' : item.coverUrl || '/src/assets/tema-cover-placeholder.png'), [broken, item.coverUrl]);

  const showActions = variant === "admin" && item.actions && item.actions.length > 0;
  const showCta = (variant === "corretor" || variant === "aluno") && item.cta;

  return (
    <article className="w-full" aria-label={item.ariaLabel || item.title}>
      <Card className="overflow-hidden">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Thumb - 16:9 aspect ratio */}
            <div className="shrink-0 w-full sm:w-60">
              <div className="relative rounded-md overflow-hidden bg-muted w-full h-40 sm:w-60 sm:h-[135px]">
                <img
                  src={imgSrc}
                  alt={`Capa de ${item.title}`}
                  width={240}
                  height={135}
                  loading="lazy"
                  className="h-full w-full object-cover"
                  onError={() => setBroken(true)}
                />
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 flex flex-col gap-2">
              {item.hrefTitle ? (
                <a href={item.hrefTitle} className="focus:outline-none focus:ring-2 focus:ring-ring rounded-sm">
                  <h3 className="text-lg sm:text-xl font-semibold text-foreground line-clamp-2">{item.title}</h3>
                </a>
              ) : (
                <h3 className="text-lg sm:text-xl font-semibold text-foreground line-clamp-2">{item.title}</h3>
              )}

              {item.subtitle && (
                <p className="text-sm text-muted-foreground line-clamp-3 sm:line-clamp-2">{item.subtitle}</p>
              )}

              {/* Badges */}
              {item.badges && item.badges.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-1" aria-label="marcadores">
                  {item.badges.map((b, i) => (
                    <Badge key={`${b.label}-${i}`} {...toneToVariant[b.tone || "neutral"]} className={cn("text-xs", toneToVariant[b.tone || "neutral"].className)}>
                      {b.label}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Meta */}
              {item.meta && item.meta.length > 0 && (
                <ul className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
                  {item.meta.map((m, i) => (
                    <li key={`${m.text}-${i}`} className="flex items-center gap-1.5">
                      <m.icon className="h-4 w-4" aria-hidden="true" />
                      <span>{m.text}</span>
                    </li>
                  ))}
                </ul>
              )}

              {/* Actions (Admin only) */}
              {showActions && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {item.actions!.map((a, i) => (
                    <Button
                      key={`${a.label}-${i}`}
                      variant={a.tone === "danger" ? "destructive" : "outline"}
                      size="sm"
                      onClick={a.onClick}
                      aria-label={a.label}
                    >
                      <a.icon className="h-4 w-4 mr-2" />
                      {a.label}
                    </Button>
                  ))}
                </div>
              )}

              {/* CTA (Corretor/Aluno only) */}
              {showCta && (
                <div className="mt-3 flex justify-end sm:justify-start">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={item.cta!.onClick}
                    aria-label={item.cta!.ariaLabel || item.cta!.label}
                    className="w-full sm:w-auto"
                  >
                    {item.cta!.label}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </article>
  );
}

export function UnifiedCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <Skeleton className="rounded-md w-full h-40 sm:w-60 sm:h-[135px]" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-4 w-5/6" />
            <div className="flex gap-2">
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-6 w-24" />
            </div>
            <Skeleton className="h-9 w-full sm:w-28" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}