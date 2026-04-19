import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { JarvisLoadingScreen } from './JarvisLoadingScreen';
import type { TutoriaSubtab } from '@/hooks/useJarvisTutoriaSubtabs';
import type { TutoriaSessao } from '@/hooks/useTutoriaSessao';

interface EtapaPreenchimentoProps {
  subtab: TutoriaSubtab;
  sessao: TutoriaSessao;
  updateSessao: (updates: Partial<TutoriaSessao>) => Promise<boolean>;
  chamarSugestoes: (dados: Record<string, string>, camposVazios: string[]) => Promise<Record<string, string> | null>;
  chamarValidacao: (dadosCompletos: Record<string, string>) => Promise<any>;
}

export const EtapaPreenchimento = ({
  subtab,
  sessao,
  updateSessao,
  chamarSugestoes,
  chamarValidacao
}: EtapaPreenchimentoProps) => {
  const [valores, setValores] = useState<Record<string, string>>(
    sessao.dados_preenchidos || {}
  );
  const [loading, setLoading] = useState(false);
  const [erroTema, setErroTema] = useState(false);

  const campos = subtab.config.campos || [];
  // O primeiro campo é sempre o obrigatório (tema da redação)
  const campoObrigatorio = campos[0];

  const handleContinuar = async () => {
    // Validar campo obrigatório (tema)
    if (campoObrigatorio && !valores[campoObrigatorio.nome]?.trim()) {
      setErroTema(true);
      return;
    }

    setErroTema(false);
    setLoading(true);

    try {
      const camposVazios = campos
        .filter(c => !valores[c.nome]?.trim())
        .map(c => c.nome);

      await updateSessao({ dados_preenchidos: valores });

      if (camposVazios.length > 0) {
        const sugestoes = await chamarSugestoes(valores, camposVazios);

        if (!sugestoes) {
          // IA falhou: volta para o formulário
          setLoading(false);
          return;
        }

        const ok = await updateSessao({
          dados_sugeridos: sugestoes,
          etapa_atual: 'sugestoes'
        });
        // Se falhou ao salvar, volta para o formulário
        if (!ok) setLoading(false);
        // Se ok, o componente pai vai trocar para EtapaSugestoes — não resetar loading
      } else {
        const validacao = await chamarValidacao(valores);

        if (!validacao) {
          setLoading(false);
          return;
        }

        const ok = await updateSessao({
          validacao_resultado: validacao,
          etapa_atual: 'validacao'
        });
        if (!ok) setLoading(false);
      }
    } catch (err) {
      console.error('Erro ao continuar:', err);
      setLoading(false);
    }
  };

  if (loading) {
    return <JarvisLoadingScreen />;
  }

  return (
    <div className="space-y-4">
      {/* Instrução */}
      {subtab.config.instrucao_aluno && (
        <p className="text-sm text-gray-600 bg-blue-50 border border-blue-100 rounded p-3">
          {subtab.config.instrucao_aluno}
        </p>
      )}

      {/* Formulário de campos */}
      <div className="space-y-4">
        {campos.map((campo, index) => {
          const obrigatorio = index === 0;
          return (
            <div key={campo.nome} className="space-y-1.5">
              <Label htmlFor={campo.nome} className="text-sm font-medium">
                {campo.label}
                {!obrigatorio && (
                  <span className="ml-1 text-xs font-normal text-gray-400">(opcional)</span>
                )}
              </Label>
              {campo.tipo === 'textarea' ? (
                <Textarea
                  id={campo.nome}
                  value={valores[campo.nome] || ''}
                  onChange={e => {
                    if (obrigatorio && erroTema) setErroTema(false);
                    setValores(v => ({ ...v, [campo.nome]: e.target.value }));
                  }}
                  placeholder={obrigatorio ? campo.placeholder : undefined}
                  rows={3}
                  className={`resize-none ${obrigatorio && erroTema ? 'border-red-400 focus-visible:ring-red-400' : ''}`}
                />
              ) : (
                <Input
                  id={campo.nome}
                  value={valores[campo.nome] || ''}
                  onChange={e => {
                    if (obrigatorio && erroTema) setErroTema(false);
                    setValores(v => ({ ...v, [campo.nome]: e.target.value }));
                  }}
                  placeholder={obrigatorio ? campo.placeholder : undefined}
                  className={obrigatorio && erroTema ? 'border-red-400 focus-visible:ring-red-400' : ''}
                />
              )}
              {obrigatorio && erroTema && (
                <p className="text-xs text-red-500">Digite o tema da redação para continuar.</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Botão continuar */}
      <Button
        onClick={handleContinuar}
        disabled={loading}
        className="w-full bg-indigo-600 hover:bg-indigo-700"
      >
        Continuar
      </Button>
    </div>
  );
};
