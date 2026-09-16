import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { TutoriaSubtab } from '@/hooks/useJarvisTutoriaSubtabs';
import type { TutoriaSessao } from '@/hooks/useTutoriaSessao';

interface EtapaResultadoProps {
  subtab: TutoriaSubtab;
  sessao: TutoriaSessao;
  resetSessao: () => Promise<boolean>;
}

export const EtapaResultado = ({ subtab, sessao, resetSessao }: EtapaResultadoProps) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleCopiar = () => {
    if (sessao.texto_gerado) {
      navigator.clipboard.writeText(sessao.texto_gerado);
      toast({
        title: "Texto copiado!",
        description: "O texto foi copiado para a área de transferência",
        className: "border-green-200 bg-green-50 text-green-900",
      });
    }
  };

  const handleNovaIntroducao = async () => {
    setLoading(true);
    await resetSessao();
    setLoading(false);
  };

  if (!sessao.texto_gerado) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p className="text-sm">Nenhum texto gerado</p>
      </div>
    );
  }

  const palavras = sessao.texto_gerado.split(/\s+/).length;

  return (
    <div className="space-y-4">
      {/* Título de sucesso */}
      <div className="flex items-center gap-2 text-green-700">
        <CheckCircle2 className="w-5 h-5" />
        <h3 className="font-semibold text-lg">Texto gerado pelo Jarvis</h3>
      </div>

      {/* Texto gerado */}
      <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-r">
        <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-line">
          {sessao.texto_gerado}
        </p>
        <div className="flex items-center gap-3 mt-4 pt-3 border-t border-green-200">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopiar}
            className="border-green-300 text-green-700 hover:bg-green-100"
          >
            <Copy className="w-3 h-3 mr-1" />
            Copiar texto
          </Button>
          <span className="text-xs text-green-700">
            {palavras} palavras • {sessao.creditos_consumidos} créditos consumidos
          </span>
        </div>
      </div>

      {/* Engenharia do parágrafo (se disponível - futuro MVP2) */}
      {sessao.engenharia_paragrafo && (
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r">
          <h4 className="font-semibold text-sm text-blue-700 mb-2">
            📊 Estrutura do Parágrafo
          </h4>
          <div className="space-y-2">
            {sessao.engenharia_paragrafo.componentes?.map((comp: any, idx: number) => (
              <div key={idx} className="text-sm">
                <span className="font-medium text-blue-800">{comp.tipo}:</span>{' '}
                <span className="text-gray-700">{comp.texto}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Botão para nova introdução */}
      <Button
        variant="outline"
        onClick={handleNovaIntroducao}
        disabled={loading}
        className="w-full border-indigo-200 text-indigo-700 hover:bg-indigo-50"
      >
        Nova introdução
      </Button>
    </div>
  );
};
