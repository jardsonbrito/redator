import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { JarvisLoadingScreen } from './JarvisLoadingScreen';
import type { TutoriaSubtab } from '@/hooks/useJarvisTutoriaSubtabs';
import type { TutoriaSessao } from '@/hooks/useTutoriaSessao';

interface EtapaSugestoesProps {
  subtab: TutoriaSubtab;
  sessao: TutoriaSessao;
  updateSessao: (updates: Partial<TutoriaSessao>) => Promise<boolean>;
  chamarValidacao: (dadosCompletos: Record<string, string>) => Promise<any>;
}

export const EtapaSugestoes = ({
  subtab,
  sessao,
  updateSessao,
  chamarValidacao
}: EtapaSugestoesProps) => {
  const [valores, setValores] = useState<Record<string, string>>({
    ...sessao.dados_preenchidos,
    ...sessao.dados_sugeridos
  });
  const [loading, setLoading] = useState(false);

  const campos = subtab.config.campos || [];
  const camposSugeridos = Object.keys(sessao.dados_sugeridos || {});

  const handleAceitar = async () => {
    setLoading(true);

    try {
      const validacao = await chamarValidacao(valores);

      if (!validacao) {
        setLoading(false);
        return;
      }

      const ok = await updateSessao({
        dados_preenchidos: {
          ...sessao.dados_preenchidos,
          ...valores
        },
        validacao_resultado: validacao,
        etapa_atual: 'validacao'
      });
      if (!ok) setLoading(false);
      // Se ok, componente pai troca para EtapaValidacao — não resetar loading
    } catch (err) {
      console.error('Erro ao aceitar sugestões:', err);
      setLoading(false);
    }
  };

  const handleVoltar = async () => {
    await updateSessao({
      dados_sugeridos: {},
      etapa_atual: 'preenchimento'
    });
  };

  if (loading) {
    return <JarvisLoadingScreen mensagem="Aguarde enquanto analisamos seus dados." />;
  }

  return (
    <div className="space-y-4">
      {/* Instrução */}
      <div className="bg-blue-50 border border-blue-200 rounded p-4">
        <p className="text-sm text-blue-900 font-medium mb-2">
          📝 Campos Preenchidos por Você
        </p>
        <div className="space-y-1 text-sm text-blue-800">
          {Object.entries(sessao.dados_preenchidos).map(([campo, valor]) => {
            const campoConfig = campos.find(c => c.nome === campo);
            if (!valor?.trim()) return null;
            return (
              <div key={campo}>
                <span className="font-medium">{campoConfig?.label || campo}:</span> {valor}
              </div>
            );
          })}
        </div>
      </div>

      {/* Sugestões editáveis */}
      <div className="bg-amber-50 border border-amber-200 rounded p-4">
        <p className="text-sm text-amber-900 font-medium mb-3">
          🤖 Sugestões do Jarvis (editáveis)
        </p>

        <div className="space-y-4">
          {campos.map((campo) => {
            if (!camposSugeridos.includes(campo.nome)) return null;

            return (
              <div key={campo.nome} className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Label htmlFor={campo.nome} className="text-sm font-medium">
                    {campo.label}
                  </Label>
                  <Badge variant="outline" className="text-xs bg-amber-100 text-amber-700 border-amber-300">
                    Sugerido pelo Jarvis
                  </Badge>
                </div>
                <Textarea
                  id={campo.nome}
                  value={valores[campo.nome] || ''}
                  onChange={e => setValores(v => ({ ...v, [campo.nome]: e.target.value }))}
                  rows={3}
                  className="resize-none bg-white"
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Ações */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={handleVoltar}
          className="flex-1"
          disabled={loading}
        >
          Voltar e preencher tudo
        </Button>
        <Button
          onClick={handleAceitar}
          disabled={loading}
          className="flex-1 bg-indigo-600 hover:bg-indigo-700"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processando...
            </>
          ) : (
            'Aceitar e continuar'
          )}
        </Button>
      </div>
    </div>
  );
};
