import React, { useMemo, useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";
import placeholderImg from "@/assets/tema-cover-placeholder.png";
import { trackAdminEvent } from "@/utils/telemetry";

export type BadgeTone = "primary" | "neutral" | "success" | "warning";
export type ActionTone = "danger" | "neutral";

export type CardItem = {
  coverUrl: string;
  title: string;
  subtitle?: string;
  badges?: { label: string; tone?: BadgeTone }[];
  meta?: { icon: LucideIcon; text: string }[];
  actions: { icon: LucideIcon; label: string; onClick: () => void; tone?: ActionTone }[];
  hrefTitle?: string;
  ariaLabel?: string;
  module?: "temas" | "exemplares" | "simulados" | string;
  id?: string;
};

const toneToVariant: Record<BadgeTone, { className?: string; variant?: "secondary" | "outline" }>
  = {
    primary: { variant: "secondary" },
    neutral: { variant: "outline" },
    success: { className: "bg-green-600 text-white" },
    warning: { className: "bg-yellow-600 text-white" },
  };

// Utility functions for badge management
function firstWord(str: string): string { 
  return (str || '').trim().split(/\s+/)[0] || ''; 
}

function updateTwoBadges(container: HTMLElement) {
  const badges = Array.from(container.querySelectorAll('.tag')) as HTMLElement[];
  if (badges.length !== 2) return;

  badges.forEach(b => {
    if (!b.dataset.full) b.dataset.full = b.textContent?.trim() || '';
    b.dataset.short = firstWord(b.dataset.full);
  });

  // Se a segunda badge "desceu", houve wrap
  const wrapped = badges[1].offsetTop > badges[0].offsetTop;
  badges.forEach(b => { 
    b.textContent = wrapped ? b.dataset.short || '' : b.dataset.full || '';
  });
}

export function AdminCard({ item }: { item: CardItem }) {
  const [broken, setBroken] = useState(false);
  const imgSrc = useMemo(() => (broken ? placeholderImg : item.coverUrl || placeholderImg), [broken, item.coverUrl]);

  // Apply badge management after render
  useEffect(() => {
    const applyBadges = () => {
      const container = document.querySelector(`[data-card-id="${item.id}"] .tags`) as HTMLElement;
      if (container) updateTwoBadges(container);
    };

    applyBadges();
    
    const handleResize = () => applyBadges();
    window.addEventListener('resize', handleResize);
    
    return () => window.removeEventListener('resize', handleResize);
  }, [item.badges, item.id]);

  return (
    <article className="h-full" aria-label={item.ariaLabel || item.title} data-card-id={item.id}>
      <Card className="h-full flex flex-col rounded-2xl border shadow-sm bg-card hover:shadow-md transition-shadow">
        <CardContent className="p-4 sm:p-5 flex flex-col h-full">
          {/* Thumbnail - Always on top in vertical layout */}
          <div className="w-full mb-4">
            <div className="relative aspect-video overflow-hidden rounded-xl bg-muted">
              <img
                src={imgSrc}
                alt={`Capa de ${item.title}`}
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover hover:scale-105 transition-transform"
                onError={() => {
                  setBroken(true);
                  if (item.module && item.id) {
                    trackAdminEvent("admin_image_fallback", { module: item.module, id: item.id });
                  }
                }}
              />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 flex flex-col gap-3">
            {/* Badges - Top */}
            {item.badges && item.badges.length > 0 && (
              <div className="flex flex-wrap items-center gap-2" aria-label="marcadores">
                {item.badges.map((b, i) => (
                  <Badge 
                    key={`${b.label}-${i}`} 
                    {...toneToVariant[b.tone || "neutral"]} 
                    className={cn("tag inline-flex items-center px-2.5 py-1 text-xs font-medium leading-tight", toneToVariant[b.tone || "neutral"].className)}
                  >
                    {b.label}
                  </Badge>
                ))}
              </div>
            )}

            {/* Title */}
            {item.hrefTitle ? (
              <a href={item.hrefTitle} className="focus:outline-none focus:ring-2 focus:ring-ring rounded-sm">
                <h3 className="text-lg md:text-xl font-semibold text-foreground leading-tight line-clamp-2">{item.title}</h3>
              </a>
            ) : (
              <h3 className="text-lg md:text-xl font-semibold text-foreground leading-tight line-clamp-2">{item.title}</h3>
            )}

            {/* Subtitle */}
            {item.subtitle && (
              <p className="text-sm text-muted-foreground line-clamp-2">{item.subtitle}</p>
            )}

            {/* Meta */}
            {item.meta && item.meta.length > 0 && (
              <div className="space-y-1.5 text-sm text-muted-foreground">
                {item.meta.map((m, i) => (
                  <div key={`${m.text}-${i}`} className="flex items-center gap-2">
                    <m.icon className="h-4 w-4 opacity-70" aria-hidden="true" />
                    <span className="break-words">{m.text}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Actions - Always at bottom */}
            <div className="mt-auto pt-3 flex items-center gap-2">
              {item.actions.map((a, i) => (
                <Button
                  key={`${a.label}-${i}`}
                  variant={a.tone === "danger" ? "destructive" : "outline"}
                  size="sm"
                  onClick={() => {
                    if (item.module && item.id) {
                      trackAdminEvent("admin_card_action_click", {
                        module: item.module,
                        action: a.label.toLowerCase(),
                        id: item.id,
                      });
                    }
                    a.onClick();
                  }}
                  aria-label={a.label}
                  className="inline-flex items-center justify-center px-3 py-2 rounded-xl text-xs font-medium"
                >
                  <a.icon className="h-4 w-4 mr-2" />
                  {a.label}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </article>
  );
}

export function AdminCardSkeleton() {
  return (
    <Card className="h-full rounded-2xl border shadow-sm">
      <CardContent className="p-4 sm:p-5">
        <div className="space-y-4">
          {/* Thumbnail skeleton */}
          <Skeleton className="w-full aspect-video rounded-xl" />
          
          {/* Content skeleton */}
          <div className="space-y-3">
            {/* Badges skeleton */}
            <div className="flex gap-2">
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-6 w-16" />
            </div>
            
            {/* Title skeleton */}
            <Skeleton className="h-6 w-4/5" />
            
            {/* Subtitle skeleton */}
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            
            {/* Meta skeleton */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
            </div>
            
            {/* Actions skeleton */}
            <div className="flex gap-2 pt-2">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-20" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
