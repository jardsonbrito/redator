import React from "react";
import { cn } from "@/lib/utils";

interface IconActionGroupProps {
  children: React.ReactNode;
  className?: string;
  orientation?: "horizontal" | "vertical";
  responsive?: boolean; // Se true, empilha em mobile
}

export const IconActionGroup = ({ 
  children, 
  className,
  orientation = "horizontal",
  responsive = true 
}: IconActionGroupProps) => {
  return (
    <div
      className={cn(
        "inline-flex gap-2",
        orientation === "horizontal" ? "flex-row" : "flex-col",
        responsive && orientation === "horizontal" && "flex-col sm:flex-row",
        className
      )}
      role="group"
      aria-label="Ações disponíveis"
    >
      {children}
    </div>
  );
};

export default IconActionGroup;