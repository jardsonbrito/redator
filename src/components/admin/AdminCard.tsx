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
    <article className="w-full" aria-label={item.ariaLabel || item.title} data-card-id={item.id}>
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
                  onError={() => {
                    setBroken(true);
                    if (item.module && item.id) {
                      trackAdminEvent("admin_image_fallback", { module: item.module, id: item.id });
                    }
                  }}
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
                <div className="tags flex flex-wrap justify-center gap-2 mt-1" aria-label="marcadores">
                  {item.badges.map((b, i) => (
                    <Badge 
                      key={`${b.label}-${i}`} 
                      {...toneToVariant[b.tone || "neutral"]} 
                      className={cn("tag inline-flex items-center px-2.5 py-0.5 text-xs font-medium leading-tight", toneToVariant[b.tone || "neutral"].className)}
                    >
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

              {/* Actions */}
              <div className="mt-3 flex flex-wrap gap-2">
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
                  >
                    <a.icon className="h-4 w-4 mr-2" />
                    {a.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </article>
  );
}

export function AdminCardSkeleton() {
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
