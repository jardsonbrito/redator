import { Card, CardContent, CardHeader } from "@/components/ui/card";

interface DetailedDashboardCardProps {
  title: string;
  icon: string;
  primaryInfo: string;
  secondaryInfo?: string;
  description: string;
  variant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning';
}

export const DetailedDashboardCard = ({
  title,
  icon,
  primaryInfo,
  secondaryInfo,
  description,
  variant = 'default'
}: DetailedDashboardCardProps) => {
  const variantClasses = {
    default: 'border-gray-200 bg-white',
    primary: 'border-blue-200 bg-blue-50',
    secondary: 'border-purple-200 bg-purple-50',
    success: 'border-green-200 bg-green-50',
    warning: 'border-yellow-200 bg-yellow-50'
  };

  const textVariants = {
    default: 'text-gray-900',
    primary: 'text-blue-900',
    secondary: 'text-purple-900',
    success: 'text-green-900',
    warning: 'text-yellow-900'
  };

  return (
    <Card className={`${variantClasses[variant]} hover:shadow-md transition-shadow`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <div className="flex items-center space-x-2">
          <span className="text-2xl">{icon}</span>
          <h3 className={`text-lg font-bold ${textVariants[variant]}`}>
            {title}
          </h3>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className={`text-sm font-semibold ${textVariants[variant]}`}>
            {primaryInfo}
          </div>
          {secondaryInfo && (
            <div className={`text-xs font-medium ${textVariants[variant]} opacity-80`}>
              {secondaryInfo}
            </div>
          )}
          <p className="text-xs text-gray-600 mt-2">
            {description}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};