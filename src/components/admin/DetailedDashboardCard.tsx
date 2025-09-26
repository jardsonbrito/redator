import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ReactNode } from "react";

interface DetailedDashboardCardProps {
  title: string;
  icon: ReactNode;
  primaryInfo: string;
  secondaryInfo?: string;
  description: string;
  variant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning';
  chips?: string[];
  chipColor?: string;
  onClick?: () => void;
  onChipClick?: (chipIndex: number, chipValue: string) => void;
}

export const DetailedDashboardCard = ({
  title,
  icon,
  primaryInfo,
  secondaryInfo,
  description,
  variant = 'default',
  chips = [],
  chipColor,
  onClick,
  onChipClick
}: DetailedDashboardCardProps) => {

  // Debug log for temas card
  if (title === 'Temas') {
    console.log('🔍 DetailedDashboardCard - Temas:', {
      primaryInfo,
      secondaryInfo,
      hasSecondaryInfo: !!secondaryInfo
    });
  }
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

  // Extract numbers from primaryInfo for better display
  const numberMatch = primaryInfo.match(/^(\d+)/);
  const number = numberMatch ? numberMatch[1] : null;
  const remainingText = number ? primaryInfo.replace(number, '').trim() : primaryInfo;

  // Function to convert hex to rgba
  const hexToRgba = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  return (
    <Card
      className={`${variantClasses[variant]} hover:shadow-lg transition-all duration-200 cursor-pointer`}
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-gray-50 to-gray-100 shadow-sm">
            {icon}
          </div>
          <h3 className={`text-base font-semibold ${textVariants[variant]}`}>
            {title}
          </h3>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Hierarquia visual com números grandes */}
        {number ? (
          <div className="space-y-1">
            <div className="text-3xl font-bold text-gray-800 leading-none">
              {number}
            </div>
            <div className="text-sm text-gray-600 leading-tight">
              {remainingText}
            </div>
          </div>
        ) : (
          <div className={`text-lg font-semibold ${textVariants[variant]}`}>
            {primaryInfo}
          </div>
        )}

        {/* Chips clicáveis */}
        {chips.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {chips.map((chip, index) => (
              <span
                key={index}
                className="px-2 py-1 text-xs font-medium rounded-full cursor-pointer transition-colors"
                style={{
                  backgroundColor: chipColor ? hexToRgba(chipColor, 0.1) : 'rgba(147, 51, 234, 0.1)',
                  color: chipColor || '#9333ea',
                  borderColor: chipColor ? hexToRgba(chipColor, 0.3) : 'rgba(147, 51, 234, 0.3)',
                  borderWidth: '1px',
                  borderStyle: 'solid'
                }}
                onMouseEnter={(e) => {
                  if (chipColor) {
                    e.currentTarget.style.backgroundColor = hexToRgba(chipColor, 0.2);
                  }
                }}
                onMouseLeave={(e) => {
                  if (chipColor) {
                    e.currentTarget.style.backgroundColor = hexToRgba(chipColor, 0.1);
                  }
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  onChipClick?.(index, chip);
                }}
              >
                {chip}
              </span>
            ))}
          </div>
        )}

        {/* Descrição com linha separadora */}
        <div className="text-xs text-gray-500 leading-relaxed border-t pt-2 mt-2">
          {description}

          {/* Informação secundária - abaixo da linha existente */}
          {secondaryInfo && (
            <div className="mt-2">
              <div className="text-xs text-gray-500 font-medium bg-gray-50 px-2 py-1 rounded">
                {secondaryInfo}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};