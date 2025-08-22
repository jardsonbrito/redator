import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Upload, ExternalLink } from "lucide-react";

interface AdminCardProps {
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  children: React.ReactNode;
  className?: string;
}

export const AdminCard = ({ title, description, icon: Icon, children, className = "" }: AdminCardProps) => {
  return (
    <Card className={`hover:shadow-lg transition-shadow duration-200 ${className}`}>
      <CardHeader className="flex flex-row items-center space-y-0 pb-2">
        <div className="flex items-center space-x-2">
          <Icon className="h-6 w-6 text-primary" />
          <div>
            <CardTitle className="text-lg">{title}</CardTitle>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {children}
      </CardContent>
    </Card>
  );
};
