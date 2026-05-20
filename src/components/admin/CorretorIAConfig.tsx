import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Bot, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type Provider = 'anthropic' | 'openai' | 'gemini';

const PROVIDER_MODELS: Record<Provider, { label: string; value: string }[]> = {
  anthropic: [
    { label: 'Claude Sonnet 4.6 (recomendado)', value: 'claude-sonnet-4-6' },
    { label: 'Claude 3.5 Sonnet', value: 'claude-3-5-sonnet-20241022' },
    { label: 'Claude 3.5 Haiku (rápido)', value: 'claude-3-5-haiku-20241022' },
    { label: 'Claude Haiku 4.5 (econômico)', value: 'claude-haiku-4-5-20251001' },
  ],
  openai: [
    { label: 'GPT-4o (recomendado)', value: 'gpt-4o' },
    { label: 'GPT-4o mini (econômico)', value: 'gpt-4o-mini' },
    { label: 'GPT-4', value: 'gpt-4' },
  ],
  gemini: [
    { label: 'Gemini 2.5 Flash (recomendado)', value: 'gemini-2.5-flash' },
    { label: 'Gemini 2.5 Pro Preview', value: 'gemini-2.5-pro-preview' },
    { label: 'Gemini 2.0 Flash (econômico)', value: 'gemini-2.0-flash' },
    { label: 'Gemini 1.5 Flash', value: 'gemini-1.5-flash' },
  ],
};

const PROVIDER_LABELS: Record<Provider, string> = {
  anthropic: 'Anthropic (Claude)',
  openai: 'OpenAI (GPT)',
  gemini: 'Google (Gemini)',
};

interface Config {
  id?: string;
  provider: Provider;
  model: string;
  temperatura: number;
  max_tokens: number;
}

const DEFAULT_CONFIG: Config = {
  provider: 'openai',
  model: 'gpt-4o-mini',
  temperatura: 0.7,
  max_tokens: 600,
};

export const CorretorIAConfig = () => {
  const { toast } = useToast();
  const [aberto, setAberto] = useState(false);
  const [loading, setLoading] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [config, setConfig] = useState<Config>(DEFAULT_CONFIG);

  useEffect(() => {
    const carregar = async () => {
      setLoading(true);
      try {
        const { data } = await supabase
          .from('corretor_ia_config')
          .select('*')
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (data) {
          setConfig({
            id: data.id,
            provider: (data.provider as Provider) || 'openai',
            model: data.model || 'gpt-4o-mini',
            temperatura: Number(data.temperatura ?? 0.7),
            max_tokens: data.max_tokens ?? 600,
          });
        }
      } finally {
        setLoading(false);
      }
    };
    carregar();
  }, []);

  const handleProviderChange = (provider: Provider) => {
    setConfig((prev) => ({
      ...prev,
      provider,
      model: PROVIDER_MODELS[provider][0].value,
    }));
  };

  const handleSalvar = async () => {
    setSalvando(true);
    try {
      let error;
      if (config.id) {
        ({ error } = await supabase
          .from('corretor_ia_config')
          .update({
            provider: config.provider,
            model: config.model,
            temperatura: config.temperatura,
            max_tokens: config.max_tokens,
            updated_at: new Date().toISOString(),
          })
          .eq('id', config.id));
      } else {
        const { data, error: e } = await supabase
          .from('corretor_ia_config')
          .insert({
            provider: config.provider,
            model: config.model,
            temperatura: config.temperatura,
            max_tokens: config.max_tokens,
          })
          .select('id')
          .single();
        error = e;
        if (data) setConfig((prev) => ({ ...prev, id: data.id }));
      }

      if (error) throw error;

      toast({
        title: '✅ Configuração salva',
        description: `Provider: ${PROVIDER_LABELS[config.provider]} · Modelo: ${config.model}`,
      });
    } catch (err: any) {
      toast({ title: '❌ Erro ao salvar', description: err?.message, variant: 'destructive' });
    } finally {
      setSalvando(false);
    }
  };

  const modelsForProvider = PROVIDER_MODELS[config.provider];
  const modelValido = modelsForProvider.some((m) => m.value === config.model);
  const modelLabel = modelsForProvider.find((m) => m.value === config.model)?.label ?? config.model;

  return (
    <div className="border border-violet-200 rounded-xl bg-white overflow-hidden mb-6">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-violet-50 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0">
            <Bot className="w-4 h-4 text-violet-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800">Configuração de IA para o Fluxo do Corretor</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {loading
                ? 'Carregando...'
                : aberto
                ? 'Controla "Refinar clareza", "Assistente de correção" e comentário geral'
                : `Provider atual: ${PROVIDER_LABELS[config.provider] || '—'} · Modelo: ${modelLabel || config.model || '—'}`}
            </p>
          </div>
        </div>
        {aberto ? (
          <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
        )}
      </button>

      {aberto && (
        <div className="border-t border-violet-100 px-5 py-5 space-y-5">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin" /> Carregando configuração...
            </div>
          ) : (
            <>
              <div className="rounded-lg bg-violet-50 border border-violet-200 px-4 py-3 text-xs text-violet-800">
                Esta configuração controla os recursos de IA usados exclusivamente no fluxo de correção:
                <strong> Refinar clareza</strong>,{' '}
                <strong>Assistente de correção</strong> e geração de{' '}
                <strong>comentário geral para o aluno</strong>.
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Provider</label>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(PROVIDER_LABELS) as Provider[]).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => handleProviderChange(p)}
                      className={cn(
                        'px-4 py-2 rounded-lg text-sm font-medium border transition-colors',
                        config.provider === p
                          ? 'bg-violet-600 text-white border-violet-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-violet-400 hover:text-violet-600',
                      )}
                    >
                      {PROVIDER_LABELS[p]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Modelo</label>
                <select
                  value={modelValido ? config.model : modelsForProvider[0].value}
                  onChange={(e) => setConfig((prev) => ({ ...prev, model: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                >
                  {modelsForProvider.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Temperatura —{' '}
                  <span className="font-mono text-violet-600">{config.temperatura.toFixed(2)}</span>
                  <span className="text-xs text-gray-400 ml-2">(0 = mais preciso · 1 = mais criativo)</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={config.temperatura}
                  onChange={(e) =>
                    setConfig((prev) => ({ ...prev, temperatura: Number(e.target.value) }))
                  }
                  className="w-full accent-violet-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Máximo de tokens de saída
                </label>
                <p className="text-xs text-gray-400 mb-2">
                  Controla o tamanho máximo da resposta da IA (400–1200 é suficiente para comentários)
                </p>
                <input
                  type="number"
                  min="200"
                  max="4000"
                  step="100"
                  value={config.max_tokens}
                  onChange={(e) =>
                    setConfig((prev) => ({ ...prev, max_tokens: Number(e.target.value) }))
                  }
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-32 focus:outline-none focus:ring-2 focus:ring-violet-400"
                />
              </div>

              <Button
                onClick={handleSalvar}
                disabled={salvando}
                className="bg-violet-600 hover:bg-violet-700 text-white"
              >
                {salvando ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Salvando...
                  </>
                ) : (
                  'Salvar configuração'
                )}
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
};
