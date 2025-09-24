import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface DashboardCardSkeletonProps {
  icon?: React.ReactNode;
  title?: string;
}

export const DashboardCardSkeleton = ({ icon, title }: DashboardCardSkeletonProps) => {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <Skeleton className="h-4 w-24" />
        {icon || <Skeleton className="h-4 w-4" />}
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-16 mb-1" />
        <Skeleton className="h-3 w-20" />
      </CardContent>
    </Card>
  );
};