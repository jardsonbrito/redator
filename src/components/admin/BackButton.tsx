
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface BackButtonProps {
  to?: string;
  label?: string;
}

export const BackButton = ({ to = "/admin", label = "Voltar" }: BackButtonProps) => {
  const navigate = useNavigate();

  const handleBack = () => {
    navigate(to);
  };

  return (
    <Button
      variant="outline"
      onClick={handleBack}
      className="flex items-center gap-2 mb-6"
    >
      <ArrowLeft className="w-4 h-4" />
      {label}
    </Button>
  );
};
