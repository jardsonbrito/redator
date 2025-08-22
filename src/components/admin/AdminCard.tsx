import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, Upload, ExternalLink } from "lucide-react";

export type BadgeTone = "default" | "success" | "warning" | "error" | "info" | "primary" | "neutral";

interface AdminCardItem {
  id: string;
  module: string;
  coverUrl?: string;
  title: string;
  subtitle?: string;
  badges?: { label: string; tone?: BadgeTone }[];
  meta?: { icon: React.ComponentType<any>; text: string }[];
  actions?: { icon: React.ComponentType<any>; label: string; onClick: () => void; tone?: string }[];
}

interface AdminCardProps {
  title?: string;
  description?: string;
  icon?: React.ComponentType<any>;
  children?: React.ReactNode;
  className?: string;
  item?: AdminCardItem;
}

export const AdminCard = ({ title, description, icon: Icon, children, className = "", item }: AdminCardProps) => {
  if (item) {
    // Legacy item-based rendering for backwards compatibility
    return (
      <Card className={`hover:shadow-lg transition-shadow duration-200 ${className}`}>
        <CardContent className="p-4">
          <div className="space-y-3">
            <div>
              <h3 className="font-semibold text-lg">{item.title}</h3>
              {item.subtitle && <p className="text-sm text-muted-foreground">{item.subtitle}</p>}
            </div>
            
            {item.badges && item.badges.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {item.badges.map((badge, index) => (
                  <span key={index} className="px-2 py-1 text-xs rounded-full bg-secondary text-secondary-foreground">
                    {badge.label}
                  </span>
                ))}
              </div>
            )}

            {item.meta && item.meta.length > 0 && (
              <div className="space-y-1">
                {item.meta.map((meta, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <meta.icon className="h-4 w-4" />
                    <span>{meta.text}</span>
                  </div>
                ))}
              </div>
            )}

            {item.actions && item.actions.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {item.actions.map((action, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={action.onClick}
                    className="h-8"
                  >
                    <action.icon className="h-4 w-4 mr-1" />
                    {action.label}
                  </Button>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`hover:shadow-lg transition-shadow duration-200 ${className}`}>
      <CardHeader className="flex flex-row items-center space-y-0 pb-2">
        <div className="flex items-center space-x-2">
          {Icon && <Icon className="h-6 w-6 text-primary" />}
          <div>
            {title && <CardTitle className="text-lg">{title}</CardTitle>}
            {description && <p className="text-sm text-muted-foreground">{description}</p>}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {children}
      </CardContent>
    </Card>
  );
};

export { AdminCardSkeleton } from "./AdminCardSkeleton";
