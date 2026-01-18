import { useSearchParams, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ClipboardList } from "lucide-react";
import { StudentHeader } from "@/components/StudentHeader";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAppSettings } from "@/hooks/useAppSettings";
import { useBreadcrumbs, usePageTitle } from "@/hooks/useBreadcrumbs";
import { RedacaoFormUnificado } from "@/components/shared/RedacaoFormUnificado";

const EnvieRedacao = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Configurar breadcrumbs e título
  const fonte = searchParams.get('fonte');
  const tema = searchParams.get('tema');
  const processoSeletivoCandidatoId = searchParams.get('processo_seletivo_candidato_id');
  const isProcessoSeletivo = !!processoSeletivoCandidatoId;

  if (isProcessoSeletivo) {
    useBreadcrumbs([
      { label: 'Início', href: '/app' },
      { label: 'Processo Seletivo', href: '/processo-seletivo' },
      { label: 'Enviar Redação' }
    ]);
  } else if (fonte === 'tema' && tema) {
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

  usePageTitle(isProcessoSeletivo ? 'Redação - Processo Seletivo' : 'Enviar Redação');

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
            {/* Badge do Processo Seletivo */}
            {isProcessoSeletivo && (
              <div className="mb-4 flex justify-center">
                <Badge className="bg-purple-600 text-white px-4 py-2 text-sm">
                  <ClipboardList className="w-4 h-4 mr-2" />
                  Processo Seletivo - Etapa Final
                </Badge>
              </div>
            )}
            <RedacaoFormUnificado
              fraseTematica={temaFromUrl ? decodeURIComponent(temaFromUrl) : ""}
              readOnlyFraseTematica={fonte === 'tema' || isProcessoSeletivo}
              fonte={isProcessoSeletivo ? 'processo_seletivo' : fonte}
              exercicioId={exercicioFromUrl}
              processoSeletivoCandidatoId={processoSeletivoCandidatoId}
              requiredCorretores={1}
              requiredCredits={isProcessoSeletivo ? 0 : 1}
            />
          </main>
        </div>
      </TooltipProvider>
    </ProtectedRoute>
  );
};

export default EnvieRedacao;