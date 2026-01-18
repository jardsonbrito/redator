import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Save, Calendar, Clock, AlertCircle, Search } from 'lucide-react';
import { useProcessoSeletivoAdmin } from '@/hooks/useProcessoSeletivoAdmin';
import { supabase } from '@/integrations/supabase/client';

interface TemaOption {
  id: string;
  frase_tematica: string;
  eixo_tematico: string;
  status: string;
}

export const PSEtapaFinalConfig: React.FC = () => {
  const {
    etapaFinal,
    isLoadingEtapaFinal,
    salvarEtapaFinal,
    isSalvandoEtapaFinal
  } = useProcessoSeletivoAdmin();

  const [form, setForm] = useState({
    tema_id: '',
    tema_redacao: '', // Mantido para compatibilidade
    instrucoes: '',
    data_inicio: '',
    hora_inicio: '',
    data_fim: '',
    hora_fim: '',
    ativo: true
  });

  const [buscaTema, setBuscaTema] = useState('');

  // Buscar temas disponíveis
  const { data: temas, isLoading: loadingTemas } = useQuery({
    queryKey: ['ps-admin-temas-etapa-final', buscaTema],
    queryFn: async (): Promise<TemaOption[]> => {
      let query = supabase
        .from('temas')
        .select('id, frase_tematica, eixo_tematico, status')
        .order('published_at', { ascending: false, nullsFirst: false })
        .order('id', { ascending: false });

      if (buscaTema) {
        query = query.ilike('frase_tematica', `%${buscaTema}%`);
      }

      const { data, error } = await query.limit(50);

      if (error) throw error;
      return data || [];
    }
  });

  const temaEscolhido = temas?.find(tema => tema.id === form.tema_id);

  useEffect(() => {
    if (etapaFinal) {
      setForm({
        tema_id: etapaFinal.tema_id || '',
        tema_redacao: etapaFinal.tema_redacao || '',
        instrucoes: etapaFinal.instrucoes || '',
        data_inicio: etapaFinal.data_inicio || '',
        hora_inicio: etapaFinal.hora_inicio || '',
        data_fim: etapaFinal.data_fim || '',
        hora_fim: etapaFinal.hora_fim || '',
        ativo: etapaFinal.ativo
      });

      // Se tem tema_id, buscar o tema para mostrar na busca
      if (etapaFinal.tema_id && temas) {
        const tema = temas.find(t => t.id === etapaFinal.tema_id);
        if (tema) {
          setBuscaTema(tema.frase_tematica);
        }
      }
    }
  }, [etapaFinal, temas]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.tema_id || !form.data_inicio || !form.hora_inicio || !form.data_fim || !form.hora_fim) {
      return;
    }

    const temaSelecionado = temas?.find(t => t.id === form.tema_id);

    salvarEtapaFinal({
      id: etapaFinal?.id,
      tema_id: form.tema_id,
      tema_redacao: temaSelecionado?.frase_tematica || form.tema_redacao,
      instrucoes: form.instrucoes || undefined,
      data_inicio: form.data_inicio,
      hora_inicio: form.hora_inicio,
      data_fim: form.data_fim,
      hora_fim: form.hora_fim,
      ativo: form.ativo
    });
  };

  // Verificar status da janela
  const verificarJanela = () => {
    if (!form.data_inicio || !form.hora_inicio || !form.data_fim || !form.hora_fim) {
      return { status: 'nao_configurado', label: 'Não configurado' };
    }

    const agora = new Date();
    const inicio = new Date(`${form.data_inicio}T${form.hora_inicio}`);
    const fim = new Date(`${form.data_fim}T${form.hora_fim}`);

    if (agora < inicio) {
      return { status: 'antes', label: 'Aguardando abertura', color: 'bg-yellow-500' };
    }
    if (agora > fim) {
      return { status: 'depois', label: 'Encerrado', color: 'bg-red-500' };
    }
    return { status: 'durante', label: 'Em andamento', color: 'bg-green-500' };
  };

  const statusJanela = verificarJanela();

  if (isLoadingEtapaFinal) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Configuração da Etapa Final (Redação)
          </div>
          {statusJanela.color && (
            <Badge className={`${statusJanela.color} text-white`}>
              {statusJanela.label}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Switch
              id="ativo"
              checked={form.ativo}
              onCheckedChange={(ativo) => setForm({ ...form, ativo })}
            />
            <Label htmlFor="ativo">Etapa final ativa</Label>
          </div>

          {/* Seleção de Tema com Autocomplete */}
          <div className="border rounded-lg p-4 bg-muted/30 space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <Search className="h-4 w-4" />
              Tema da Redação *
            </h4>

            <div>
              <Label htmlFor="busca_tema">Buscar tema cadastrado</Label>
              <Input
                id="busca_tema"
                value={buscaTema}
                onChange={(e) => setBuscaTema(e.target.value)}
                placeholder="Digite para buscar temas..."
                className="mb-2"
              />
            </div>

            {loadingTemas ? (
              <div className="text-sm text-gray-500">Carregando temas...</div>
            ) : (
              <div>
                <Label>Selecionar tema</Label>
                <Select
                  value={form.tema_id}
                  onValueChange={(value) => setForm({ ...form, tema_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um tema..." />
                  </SelectTrigger>
                  <SelectContent>
                    {temas?.map((tema) => (
                      <SelectItem key={tema.id} value={tema.id}>
                        <div className="flex items-center gap-2">
                          <span className="truncate max-w-[300px]">{tema.frase_tematica}</span>
                          <Badge
                            variant={tema.status === 'rascunho' ? 'secondary' : 'default'}
                            className="text-xs ml-2"
                          >
                            {tema.status === 'rascunho' ? 'Rascunho' : 'Publicado'}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {temaEscolhido && (
              <div className="p-4 bg-background rounded-lg border border-green-200">
                <h5 className="font-medium text-sm text-green-700 mb-2">Tema Selecionado:</h5>
                <p className="text-sm text-gray-700 mb-2">"{temaEscolhido.frase_tematica}"</p>
                <div className="flex items-center gap-2">
                  <Badge variant={temaEscolhido.status === 'rascunho' ? 'secondary' : 'default'}>
                    {temaEscolhido.status === 'rascunho' ? 'Rascunho' : 'Publicado'}
                  </Badge>
                  <span className="text-xs text-gray-500">
                    Eixo: {temaEscolhido.eixo_tematico}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="instrucoes">Instruções (opcional)</Label>
            <Textarea
              id="instrucoes"
              value={form.instrucoes}
              onChange={(e) => setForm({ ...form, instrucoes: e.target.value })}
              placeholder="Instruções adicionais para os candidatos..."
              rows={4}
            />
            <p className="text-xs text-gray-500 mt-1">
              Estas instruções serão exibidas no card antes da abertura da janela de envio.
            </p>
          </div>

          <div className="border rounded-lg p-4 bg-muted/30">
            <h4 className="font-medium mb-4 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Janela de Envio
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-4">
                <h5 className="text-sm font-medium text-green-600">Abertura</h5>
                <div>
                  <Label htmlFor="data_inicio" className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Data de Início *
                  </Label>
                  <Input
                    id="data_inicio"
                    type="date"
                    value={form.data_inicio}
                    onChange={(e) => setForm({ ...form, data_inicio: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="hora_inicio" className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Horário de Início *
                  </Label>
                  <Input
                    id="hora_inicio"
                    type="time"
                    value={form.hora_inicio}
                    onChange={(e) => setForm({ ...form, hora_inicio: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h5 className="text-sm font-medium text-red-600">Encerramento</h5>
                <div>
                  <Label htmlFor="data_fim" className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Data de Encerramento *
                  </Label>
                  <Input
                    id="data_fim"
                    type="date"
                    value={form.data_fim}
                    onChange={(e) => setForm({ ...form, data_fim: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="hora_fim" className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Horário de Encerramento *
                  </Label>
                  <Input
                    id="hora_fim"
                    type="time"
                    value={form.hora_fim}
                    onChange={(e) => setForm({ ...form, hora_fim: e.target.value })}
                    required
                  />
                </div>
              </div>
            </div>

            {form.data_inicio && form.hora_inicio && form.data_fim && form.hora_fim && (
              <div className="mt-4 p-3 bg-background rounded-lg border">
                <p className="text-sm">
                  <strong>Resumo:</strong> Os candidatos poderão enviar suas redações entre{' '}
                  <span className="text-green-600 font-medium">
                    {new Date(`${form.data_inicio}T${form.hora_inicio}`).toLocaleString('pt-BR')}
                  </span>
                  {' '}e{' '}
                  <span className="text-red-600 font-medium">
                    {new Date(`${form.data_fim}T${form.hora_fim}`).toLocaleString('pt-BR')}
                  </span>
                </p>
              </div>
            )}
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <strong>Como funciona:</strong> Quando a janela de envio estiver aberta, os candidatos
              aprovados serão direcionados para a página do tema selecionado, onde poderão ler os
              textos motivadores e enviar sua redação utilizando o sistema padrão da plataforma.
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-yellow-800">
              <strong>Importante:</strong> Os candidatos só conseguirão enviar suas redações dentro
              da janela de tempo configurada. Certifique-se de que os horários estão corretos antes
              de salvar.
            </div>
          </div>

          <div className="pt-4">
            <Button
              type="submit"
              disabled={
                !form.tema_id ||
                !form.data_inicio ||
                !form.hora_inicio ||
                !form.data_fim ||
                !form.hora_fim ||
                isSalvandoEtapaFinal
              }
            >
              <Save className="h-4 w-4 mr-2" />
              {etapaFinal ? 'Atualizar Configuração' : 'Criar Configuração'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default PSEtapaFinalConfig;
