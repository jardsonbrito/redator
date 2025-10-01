import { Check, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface InboxProgressIndicatorProps {
  messageLength: number;
  hasDestinarios: boolean;
  destinatariosCount: number;
}

interface ProgressStep {
  id: string;
  label: string;
  isCompleted: boolean;
  description?: string;
}

export function InboxProgressIndicator({
  messageLength,
  hasDestinarios,
  destinatariosCount
}: InboxProgressIndicatorProps) {

  const steps: ProgressStep[] = [
    {
      id: "message",
      label: "Mensagem",
      isCompleted: messageLength >= 10,
      description: messageLength >= 10 ? "Completo" : "Mínimo 10 caracteres"
    },
    {
      id: "config",
      label: "Configuração",
      isCompleted: true, // Sempre completo pois tem valores padrão
      description: "Completo"
    },
    {
      id: "recipients",
      label: "Destinatários",
      isCompleted: hasDestinarios,
      description: hasDestinarios ? `${destinatariosCount} alunos selecionados` : "Nenhum aluno selecionado"
    }
  ];

  const completedSteps = steps.filter(step => step.isCompleted).length;
  const totalSteps = steps.length;
  const progressPercentage = (completedSteps / totalSteps) * 100;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-medium text-blue-900">
          Progresso da Configuração
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Barra de progresso */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-blue-700">
            <span>Etapas concluídas</span>
            <span>{completedSteps}/{totalSteps}</span>
          </div>
          <Progress
            value={progressPercentage}
            className="h-2"
          />
        </div>

        {/* Lista de etapas */}
        <div className="space-y-3">
          {steps.map((step) => (
            <div
              key={step.id}
              className="flex items-center gap-3"
            >
              {/* Ícone de status */}
              <div className="flex-shrink-0">
                {step.isCompleted ? (
                  <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                ) : (
                  <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                    <X className="w-3 h-3 text-white" />
                  </div>
                )}
              </div>

              {/* Texto da etapa */}
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-medium ${
                    step.isCompleted ? 'text-green-700' : 'text-red-700'
                  }`}>
                    {step.label}:
                  </span>
                  <span className={`text-sm ${
                    step.isCompleted ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {step.description}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Mensagem de status geral */}
        {completedSteps === totalSteps && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <p className="text-sm text-green-800 font-medium">
              ✅ Configuração completa! Pronto para enviar.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}