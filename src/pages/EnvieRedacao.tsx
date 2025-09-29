import { useSearchParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StudentHeader } from "@/components/StudentHeader";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAppSettings } from "@/hooks/useAppSettings";
import { useBreadcrumbs, usePageTitle } from "@/hooks/useBreadcrumbs";
import { RedacaoFormUnificado } from "@/components/shared/RedacaoFormUnificado";

const EnvieRedacao = () => {
  const [searchParams] = useSearchParams();

  // Configurar breadcrumbs e título
  const fonte = searchParams.get('fonte');
  const tema = searchParams.get('tema');

  if (fonte === 'tema' && tema) {
    useBreadcrumbs([
      { label: 'Início', href: '/app' },
      { label: 'Temas', href: '/temas' },
      { label: 'Enviar Redação' }
    ]);
  } else if (fonte === 'exercicio') {
    useBreadcrumbs([
      { label: 'Início', href: '/app' },
      { label: 'Exercícios', href: '/exercicios' },
      { label: 'Enviar Redação' }
    ]);
  } else {
    useBreadcrumbs([
      { label: 'Início', href: '/app' },
      { label: 'Enviar Redação' }
    ]);
  }

  usePageTitle('Enviar Redação');

  const temaFromUrl = searchParams.get('tema');
  const exercicioFromUrl = searchParams.get('exercicio');
  const { settings } = useAppSettings();

  // Verificar se acesso ao tema livre está desabilitado
  const isFreeTopicAccess = !temaFromUrl && !exercicioFromUrl;
  const isFreeTopicDisabled = isFreeTopicAccess && settings && settings.free_topic_enabled === false;

  // Verificar se tema livre está desabilitado
  if (isFreeTopicDisabled) {
    return (
      <ProtectedRoute>
        <TooltipProvider>
          <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100">
            <StudentHeader pageTitle="Enviar Redação" />
            <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <Card className="border-amber-200 bg-amber-50">
                <CardContent className="p-8 text-center">
                  <div className="text-6xl mb-4">🔒</div>
                  <h2 className="text-2xl font-bold text-amber-800 mb-4">
                    Função Temporariamente Desabilitada
                  </h2>
                  <p className="text-amber-700 mb-6">
                    O envio de redações por tema livre está temporariamente desabilitado.
                  </p>
                  <Button
                    onClick={() => navigate('/app')}
                    className="bg-amber-600 hover:bg-amber-700"
                  >
                    Voltar ao Início
                  </Button>
                </CardContent>
              </Card>
            </main>
          </div>
        </TooltipProvider>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <TooltipProvider>
        <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100">
          <StudentHeader pageTitle="Enviar Redação" />
          <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <RedacaoFormUnificado
              fraseTematica={temaFromUrl ? decodeURIComponent(temaFromUrl) : ""}
              readOnlyFraseTematica={fonte === 'tema'}
              fonte={fonte}
              exercicioId={exercicioFromUrl}
              requiredCorretores={1}
              requiredCredits={1}
            />
          </main>
        </div>
      </TooltipProvider>
    </ProtectedRoute>
  );
};

export default EnvieRedacao;