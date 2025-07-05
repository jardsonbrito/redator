
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

export const CreditBypassNotice = () => {
  return (
    <Alert className="mb-6 border-orange-200 bg-orange-50">
      <AlertTriangle className="h-4 w-4 text-orange-600" />
      <AlertDescription className="text-orange-800">
        <strong>⚠️ SISTEMA DE CRÉDITOS TEMPORARIAMENTE DESATIVADO</strong>
        <br />
        O envio de redações está liberado até a correção completa do sistema.
      </AlertDescription>
    </Alert>
  );
};
