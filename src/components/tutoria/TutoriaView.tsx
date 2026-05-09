import { useState } from 'react';
import { useJarvisTutoriaSubtabs } from '@/hooks/useJarvisTutoriaSubtabs';
import { JarvisLoadingScreen } from './JarvisLoadingScreen';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Lock, CheckCircle2, Copy, RefreshCw, FileText, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import type { JarvisModo } from '@/hooks/useJarvisModos';

type ParteId = 'introducao' | 'desenvolvimento_1' | 'desenvolvimento_2' | 'conclusao' | 'redacao_completa';

interface Parte {
  id: ParteId;
  label: string;
  subtabNome: string | null;
}

const PARTES: Parte[] = [
  { id: 'introducao',        label: 'Introdução',        subtabNome: 'introducao'      },
  { id: 'desenvolvimento_1', label: 'Desenvolvimento 1', subtabNome: 'desenvolvimento' },
  { id: 'desenvolvimento_2', label: 'Desenvolvimento 2', subtabNome: 'desenvolvimento' },
  { id: 'conclusao',         label: 'Conclusão',         subtabNome: 'conclusao'       },
  { id: 'redacao_completa',  label: 'Redação completa',  subtabNome: null              },
];

const EXPLICACOES: Record<ParteId, string> = {
  introducao:
    'A introdução apresenta o repertório sociocultural, contextualiza o tema no Brasil e expõe a tese causal com os dois aspectos que serão desenvolvidos.',
  desenvolvimento_1:
    'O 1º parágrafo de desenvolvimento aprofunda o primeiro aspecto causal da tese usando a célula argumentativa: tópico frasal, explicação, embasamento e aplicação ao tema.',
  desenvolvimento_2:
    'O 2º parágrafo de desenvolvimento aprofunda o segundo aspecto causal, seguindo a mesma estrutura da célula argumentativa com argumento, embasamento e relação de causalidade.',
  conclusao:
    'A conclusão retoma sinteticamente a tese e apresenta uma proposta de intervenção detalhada com os elementos C5: agente, ação, meio/modo, finalidade e detalhamento.',
  redacao_completa:
    'Redação completa com introdução, dois parágrafos de desenvolvimento e conclusão, seguindo a estrutura dissertativo-argumentativa do ENEM.',
};

interface ResultadoGerado {
  texto: string;
  palavras: number;
  creditos: number;
  parte: ParteId;
  temaUsado: string;
}

interface TutoriaViewProps {
  modo: JarvisModo;
  userEmail: string;
}

export const TutoriaView = ({ modo, userEmail }: TutoriaViewProps) => {
  const { subtabs, loading: loadingSubtabs } = useJarvisTutoriaSubtabs(modo.id);
  const [tema, setTema] = useState('');
  const [parteId, setParteId] = useState<ParteId>('introducao');
  const [resultado, setResultado] = useState<ResultadoGerado | null>(null);
  const [loading, setLoading] = useState(false);
  const [erroTema, setErroTema] = useState(false);
  const { toast } = useToast();

  if (loadingSubtabs) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
      </div>
    );
  }

  const isParteDisponivel = (parte: Parte): boolean => {
    if (parte.subtabNome === null) {
      return ['introducao', 'desenvolvimento', 'conclusao'].every(nome =>
        subtabs.some(s => s.nome === nome && s.habilitada)
      );
    }
    return subtabs.some(s => s.nome === parte.subtabNome && s.habilitada);
  };

  const getCreditosNecessarios = (id: ParteId): number => {
    if (id === 'redacao_completa') return 4;
    const parte = PARTES.find(p => p.id === id);
    if (!parte?.subtabNome) return 1;
    const subtab = subtabs.find(s => s.nome === parte.subtabNome);
    return subtab?.config.creditos_consumo || 1;
  };

  const executarGeracao = async (temaParam: string, parteParam: ParteId) => {
    const creditosNecessarios = getCreditosNecessarios(parteParam);

    if (parteParam === 'redacao_completa') {
      const { data, error } = await supabase.functions.invoke('jarvis-redacao-completa', {
        body: { userEmail, modoId: modo.id, tema: temaParam, creditosNecessarios },
      });

      if (error) throw error;
      if (!data.success) {
        if (data.creditos_atuais !== undefined) {
          toast({
            title: 'Créditos insuficientes',
            description: `Você tem ${data.creditos_atuais} crédito(s). São necessários ${creditosNecessarios}.`,
            variant: 'destructive',
          });
          return null;
        }
        throw new Error(data.error || 'Erro ao gerar redação');
      }

      return {
        texto: data.texto_gerado,
        palavras: data.palavras_geradas,
        creditos: data.creditos_consumidos,
        parte: parteParam,
        temaUsado: temaParam,
      } satisfies ResultadoGerado;
    }

    const parte = PARTES.find(p => p.id === parteParam)!;
    const { data, error } = await supabase.functions.invoke('jarvis-tutoria-gerar', {
      body: {
        userEmail,
        modoId: modo.id,
        subtabNome: parte.subtabNome,
        dadosCompletos: { tema: temaParam },
        creditosNecessarios,
      },
    });

    if (error) throw error;
    if (!data.success) {
      if (data.creditos_atuais !== undefined) {
        toast({
          title: 'Créditos insuficientes',
          description: `Você tem ${data.creditos_atuais} crédito(s). São necessários ${creditosNecessarios}.`,
          variant: 'destructive',
        });
        return null;
      }
      throw new Error(data.error || 'Erro ao gerar texto');
    }

    return {
      texto: data.texto_gerado,
      palavras: data.palavras_geradas,
      creditos: data.creditos_consumidos,
      parte: parteParam,
      temaUsado: temaParam,
    } satisfies ResultadoGerado;
  };

  const handleGerar = async () => {
    if (!tema.trim()) {
      setErroTema(true);
      return;
    }
    setErroTema(false);
    setLoading(true);
    setResultado(null);

    try {
      const res = await executarGeracao(tema, parteId);
      if (res) setResultado(res);
    } catch (err) {
      console.error('Erro ao gerar:', err);
      toast({
        title: 'Erro ao gerar texto',
        description: err instanceof Error ? err.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGerarNovamente = async () => {
    if (!resultado) return;
    setLoading(true);
    setResultado(null);

    try {
      const res = await executarGeracao(resultado.temaUsado, resultado.parte);
      if (res) setResultado(res);
    } catch (err) {
      console.error('Erro ao gerar novamente:', err);
      toast({
        title: 'Erro ao gerar texto',
        description: err instanceof Error ? err.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopiar = () => {
    if (resultado?.texto) {
      navigator.clipboard.writeText(resultado.texto);
      toast({
        title: 'Texto copiado!',
        description: 'O texto foi copiado para a área de transferência',
        className: 'border-green-200 bg-green-50 text-green-900',
      });
    }
  };

  const handleNovaProducao = () => {
    setTema('');
    setResultado(null);
    setParteId('introducao');
    setErroTema(false);
  };

  if (loading) {
    return (
      <JarvisLoadingScreen
        mensagem={
          parteId === 'redacao_completa'
            ? 'Gerando sua redação completa... isso pode levar alguns segundos.'
            : 'Aguarde enquanto o Jarvis gera seu texto.'
        }
      />
    );
  }

  // ── Tela de resultado ──────────────────────────────────────────
  if (resultado) {
    const labelParte = PARTES.find(p => p.id === resultado.parte)?.label ?? resultado.parte;
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-green-700">
          <CheckCircle2 className="w-5 h-5" />
          <h3 className="font-semibold text-lg">{labelParte} gerada pelo Jarvis</h3>
        </div>

        <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-r">
          <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-line">
            {resultado.texto}
          </p>
          <div className="flex flex-wrap items-center gap-3 mt-4 pt-3 border-t border-green-200">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopiar}
              className="border-green-300 text-green-700 hover:bg-green-100"
            >
              <Copy className="w-3 h-3 mr-1" />
              Copiar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleGerarNovamente}
              className="border-indigo-300 text-indigo-700 hover:bg-indigo-50"
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              Gerar novamente
            </Button>
            <span className="text-xs text-gray-500">
              {resultado.palavras} palavras
            </span>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-100 rounded p-3">
          <div className="flex items-start gap-2">
            <FileText className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-semibold text-blue-700 mb-1">Sobre a estrutura gerada</p>
              <p className="text-xs text-blue-800">{EXPLICACOES[resultado.parte]}</p>
            </div>
          </div>
        </div>

        <Button
          variant="outline"
          onClick={handleNovaProducao}
          className="w-full border-gray-200 text-gray-600 hover:bg-gray-50"
        >
          Nova produção
        </Button>
      </div>
    );
  }

  // ── Tela de entrada ────────────────────────────────────────────
  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="tema" className="text-sm font-medium">
          Tema da redação <span className="text-red-500">*</span>
        </Label>
        <Textarea
          id="tema"
          value={tema}
          onChange={e => {
            setTema(e.target.value);
            if (erroTema) setErroTema(false);
          }}
          placeholder="Ex: Os desafios da educação no Brasil contemporâneo"
          rows={3}
          className={cn('resize-none', erroTema && 'border-red-400 focus-visible:ring-red-400')}
        />
        {erroTema && (
          <p className="text-xs text-red-500">Digite o tema da redação para continuar.</p>
        )}
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-gray-700">O que deseja gerar?</p>
        <div className="flex flex-wrap gap-2">
          {PARTES.map((parte) => {
            const disponivel = isParteDisponivel(parte);
            return (
              <button
                key={parte.id}
                type="button"
                onClick={() => disponivel && setParteId(parte.id)}
                disabled={!disponivel}
                className={cn(
                  'px-3 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-1.5',
                  parteId === parte.id && disponivel
                    ? 'bg-indigo-700 text-white'
                    : disponivel
                    ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                )}
              >
                {parte.label}
                {!disponivel && <Lock className="w-3 h-3" />}
              </button>
            );
          })}
        </div>
      </div>

      <Button
        onClick={handleGerar}
        className="w-full bg-indigo-600 hover:bg-indigo-700"
      >
        Gerar com Jarvis
      </Button>
    </div>
  );
};
