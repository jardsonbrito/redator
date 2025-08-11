import React, { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";
import placeholderImg from "@/assets/tema-cover-placeholder.png";

export type BadgeTone = "primary" | "neutral" | "success" | "warning";

export type CardAlunoItem = {
  coverUrl: string;
  title: string;
  subtitle?: string;
  badges?: { label: string; tone?: BadgeTone }[];
  meta?: { icon: LucideIcon; text: string }[];
  cta?: { label: string; onClick: () => void; ariaLabel?: string };
  ariaLabel?: string;
};

const toneToVariant: Record<BadgeTone, { className?: string; variant?: "secondary" | "outline" }>
  = {
    primary: { variant: "secondary" },
    neutral: { variant: "outline" },
    success: { className: "bg-green-600 text-white" },
    warning: { className: "bg-yellow-600 text-white" },
  };

export function AlunoCard({ item }: { item: CardAlunoItem }) {
  const [broken, setBroken] = useState(false);
  const imgSrc = useMemo(() => (broken ? placeholderImg : item.coverUrl || placeholderImg), [broken, item.coverUrl]);

  return (
    <article className="w-full" aria-label={item.ariaLabel || item.title}>
      <Card className="overflow-hidden">
        <CardContent className="p-4">
          <div className="flex gap-4">
            {/* Thumb */}
            <div className="shrink-0" style={{ width: 240 }}>
              <div className="relative rounded-md overflow-hidden bg-muted" style={{ width: 240, height: 135 }}>
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
              <h3 className="text-xl font-semibold text-foreground line-clamp-2">{item.title}</h3>

              {item.subtitle && (
                <p className="text-sm text-muted-foreground line-clamp-2">{item.subtitle}</p>
              )}

              {/* Badges */}
              {item.badges && item.badges.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-1" aria-label="marcadores">
                  {item.badges.map((b, i) => (
                    <Badge key={`${b.label}-${i}`} {...toneToVariant[b.tone || "neutral"]} className={cn(toneToVariant[b.tone || "neutral"].className)}>
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

              {/* CTA */}
              {item.cta && (
                <div className="mt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={item.cta.onClick}
                    aria-label={item.cta.ariaLabel || item.cta.label}
                  >
                    {item.cta.label}
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

export function AlunoCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex gap-4">
          <Skeleton className="rounded-md" style={{ width: 240, height: 135 }} />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-4 w-5/6" />
            <div className="flex gap-2">
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-6 w-24" />
            </div>
            <Skeleton className="h-9 w-28" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
