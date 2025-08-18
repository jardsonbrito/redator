import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function SkeletonCard() {
  return (
    <Card className="rounded-2xl shadow-sm border bg-card p-4 md:p-5">
      <div className="grid md:grid-cols-[320px_minmax(0,1fr)] gap-4 md:gap-5 items-start">
        {/* Thumbnail skeleton */}
        <Skeleton className="w-full aspect-video rounded-xl" />
        
        {/* Content skeleton */}
        <div className="flex flex-col gap-3">
          {/* Badges skeleton */}
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
          
          {/* Title skeleton */}
          <Skeleton className="h-6 w-3/4" />
          
          {/* Description skeleton */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
          
          {/* Meta skeleton */}
          <div className="flex gap-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-20" />
          </div>
          
          {/* Actions skeleton */}
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <div className="grid md:grid-cols-2 gap-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}