import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertCircle } from 'lucide-react';
import type { TutoriaSubtab } from '@/hooks/useJarvisTutoriaSubtabs';
import type { TutoriaSessao } from '@/hooks/useTutoriaSessao';

interface EtapaValidacaoProps {
  subtab: TutoriaSubtab;
  sessao: TutoriaSessao;
  updateSessao: (updates: Partial<TutoriaSessao>) => Promise<boolean>;
  chamarGeracao: (dados: Record<string, string>, creditos: number) => Promise<any>;
  refreshSessao: () => Promise<void>;
}

export const EtapaValidacao = ({
  subtab,
  sessao,
  updateSessao,
  chamarGeracao,
  refreshSessao
}: EtapaValidacaoProps) => {
  const [loading, setLoading] = useState(false);

  const validacao = sessao.validacao_resultado;
  const dadosCompletos = { ...sessao.dados_preenchidos, ...sessao.dados_sugeridos };
  const camposSugeridos = Object.keys(sessao.dados_sugeridos || {});
  const creditosNecessarios = subtab.config.creditos_consumo || 3;

  const handleEditar = async () => {
    // Volta para preenchimento mantendo os dados
    await updateSessao({
      etapa_atual: 'preenchimento'
    });
  };

  const handleGerar = async () => {
    setLoading(true);

    try {
      console.log('🚀 Iniciando geração...');
      const resultado = await chamarGeracao(dadosCompletos, creditosNecessarios);

      if (resultado) {
        console.log('✅ Geração bem-sucedida!');
        // Edge function já atualiza a sessão, não precisa recarregar
        // O updateSessao será chamado pela edge function
      }
    } catch (err) {
      console.error('❌ Erro ao gerar:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!validacao) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p className="text-sm">Erro ao carregar validação</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Devolutiva geral */}
      <Alert className="border-blue-200 bg-blue-50">
        <AlertCircle className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-900">
          <p className="font-medium mb-1">Análise dos Insumos</p>
          <p className="text-sm">{validacao.mensagem_geral}</p>
        </AlertDescription>
      </Alert>

      {/* Avaliações por campo */}
      <div className="space-y-3">
        <p className="text-sm font-medium text-gray-700">Avaliação por Campo:</p>

        {validacao.avaliacoes_campo?.map((avaliacao: any, index: number) => (
          <div key={index} className="border rounded p-3 bg-white">
            <div className="flex items-start justify-between mb-2">
              <p className="font-medium text-sm">{avaliacao.campo}</p>
              <div className="flex items-center gap-2">
                {camposSugeridos.includes(avaliacao.campo) && (
                  <Badge variant="outline" className="text-xs bg-amber-100 text-amber-700 border-amber-300">
                    Sugerido pelo Jarvis
                  </Badge>
                )}
                <Badge
                  variant="outline"
                  className={`text-xs ${
                    avaliacao.qualidade === 'alta'
                      ? 'bg-green-100 text-green-700 border-green-300'
                      : avaliacao.qualidade === 'media'
                      ? 'bg-amber-100 text-amber-700 border-amber-300'
                      : 'bg-red-100 text-red-700 border-red-300'
                  }`}
                >
                  {avaliacao.qualidade === 'alta' ? 'Adequado' : avaliacao.qualidade === 'media' ? 'Médio' : 'Baixo'}
                </Badge>
              </div>
            </div>
            <p className="text-xs text-gray-600 mb-2">{avaliacao.comentario}</p>
            <p className="text-sm text-gray-800 bg-gray-50 rounded p-2 border">
              {dadosCompletos[avaliacao.campo]}
            </p>
          </div>
        ))}
      </div>

      {/* Consumo de créditos */}
      <Alert className="border-amber-200 bg-amber-50">
        <AlertDescription className="text-amber-900 text-sm">
          💳 Gerar a introdução consumirá <strong>{creditosNecessarios} créditos Jarvis</strong>
        </AlertDescription>
      </Alert>

      {/* Ações */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={handleEditar}
          disabled={loading}
          className="flex-1"
        >
          Editar campos
        </Button>
        <Button
          onClick={handleGerar}
          disabled={loading}
          className="flex-1 bg-green-600 hover:bg-green-700"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Gerando...
            </>
          ) : (
            'Gerar introdução'
          )}
        </Button>
      </div>
    </div>
  );
};
