import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
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

  const campos = subtab.config.campos || [];

  const handleContinuar = async () => {
    setLoading(true);

    try {
      // Identificar campos vazios
      const camposVazios = campos
        .filter(c => !valores[c.nome]?.trim())
        .map(c => c.nome);

      // Salvar dados preenchidos
      await updateSessao({
        dados_preenchidos: valores
      });

      // Se há campos vazios, pedir sugestões
      if (camposVazios.length > 0) {
        const sugestoes = await chamarSugestoes(valores, camposVazios);

        if (sugestoes) {
          // Atualizar sessão com sugestões e mudar etapa
          await updateSessao({
            dados_sugeridos: sugestoes,
            etapa_atual: 'sugestoes'
          });
        }
      } else {
        // Todos campos preenchidos, vai direto para validação
        const validacao = await chamarValidacao(valores);

        if (validacao) {
          await updateSessao({
            validacao_resultado: validacao,
            etapa_atual: 'validacao'
          });
        }
      }
    } catch (err) {
      console.error('Erro ao continuar:', err);
    } finally {
      setLoading(false);
    }
  };

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
        {campos.map((campo) => (
          <div key={campo.nome} className="space-y-1.5">
            <Label htmlFor={campo.nome} className="text-sm font-medium">
              {campo.label}
            </Label>
            {campo.tipo === 'textarea' ? (
              <Textarea
                id={campo.nome}
                value={valores[campo.nome] || ''}
                onChange={e => setValores(v => ({ ...v, [campo.nome]: e.target.value }))}
                placeholder={campo.placeholder}
                rows={3}
                className="resize-none"
              />
            ) : (
              <Input
                id={campo.nome}
                value={valores[campo.nome] || ''}
                onChange={e => setValores(v => ({ ...v, [campo.nome]: e.target.value }))}
                placeholder={campo.placeholder}
              />
            )}
          </div>
        ))}
      </div>

      {/* Botão continuar */}
      <Button
        onClick={handleContinuar}
        disabled={loading}
        className="w-full bg-indigo-600 hover:bg-indigo-700"
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processando...
          </>
        ) : (
          'Continuar'
        )}
      </Button>
    </div>
  );
};
