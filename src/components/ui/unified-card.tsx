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
  secondaryCta?: { label: string; onClick: () => void; ariaLabel?: string };
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
  const showCta = (variant === "corretor" || variant === "aluno") && (item.cta || item.secondaryCta);

  return (
    <article className="w-full" aria-label={item.ariaLabel || item.title} role="article">
      <Card className="rounded-2xl border shadow-sm bg-card transition-shadow hover:shadow-md">
        <CardContent className="p-4 lg:p-6">
          <div className="grid lg:grid-cols-[280px_minmax(0,1fr)] items-start gap-4 lg:gap-6">
            {/* Thumb - 16:9 aspect ratio */}
            <div className="relative w-full aspect-video overflow-hidden rounded-xl bg-muted transition-transform hover:scale-[1.02] group">
              <img
                src={imgSrc}
                alt={`Capa de ${item.title}`}
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover"
                onError={() => setBroken(true)}
              />
            </div>

            {/* Info */}
            <div className="flex flex-col gap-3">
              {/* Badges */}
              {item.badges && item.badges.length > 0 && (
                <div className="flex flex-wrap items-center gap-2" aria-label="marcadores">
                  {item.badges.map((b, i) => (
                    <Badge 
                      key={`${b.label}-${i}`} 
                      {...toneToVariant[b.tone || "neutral"]} 
                      className={cn("inline-flex items-center px-2.5 py-0.5 text-xs font-medium leading-tight", toneToVariant[b.tone || "neutral"].className)}
                    >
                      {b.label}
                    </Badge>
                  ))}
                </div>
              )}

              {item.hrefTitle ? (
                <a href={item.hrefTitle} className="focus:outline-none focus:ring-2 focus:ring-ring rounded-sm">
                  <h3 className="text-xl lg:text-2xl font-semibold leading-tight line-clamp-2">{item.title}</h3>
                </a>
              ) : (
                <h3 className="text-xl lg:text-2xl font-semibold leading-tight line-clamp-2">{item.title}</h3>
              )}

              {item.subtitle && (
                <p className="text-base text-muted-foreground line-clamp-2">{item.subtitle}</p>
              )}

              {/* Meta */}
              {item.meta && item.meta.length > 0 && (
                <ul className="flex flex-wrap gap-4 mt-1 text-sm text-muted-foreground">
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
                <div className="mt-4 flex flex-col lg:flex-row gap-3 lg:justify-end">
                  {item.cta && (
                    <Button
                      onClick={item.cta.onClick}
                      aria-label={item.cta.ariaLabel || item.cta.label}
                      className="w-full lg:w-auto"
                      size="lg"
                    >
                      {item.cta.label}
                    </Button>
                  )}
                  {item.secondaryCta && (
                    <Button
                      variant="outline"
                      onClick={item.secondaryCta.onClick}
                      aria-label={item.secondaryCta.ariaLabel || item.secondaryCta.label}
                      className="w-full lg:w-auto"
                      size="lg"
                    >
                      {item.secondaryCta.label}
                    </Button>
                  )}
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
    <Card className="rounded-2xl border shadow-sm bg-card">
      <CardContent className="p-4 lg:p-6">
        <div className="grid lg:grid-cols-[280px_minmax(0,1fr)] items-start gap-4 lg:gap-6">
          <Skeleton className="w-full aspect-video rounded-xl" />
          <div className="space-y-4">
            <div className="flex gap-2">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-6 w-20" />
            </div>
            <Skeleton className="h-7 w-4/5" />
            <Skeleton className="h-5 w-full" />
            <div className="flex gap-4">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-16" />
            </div>
            <div className="flex gap-3 mt-4">
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-28" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}