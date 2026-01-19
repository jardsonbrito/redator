import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Save, Calendar, Clock, Search, Trash2, Edit } from 'lucide-react';
import { useProcessoSeletivoAdmin } from '@/hooks/useProcessoSeletivoAdmin';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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
    excluirEtapaFinal,
    isSalvandoEtapaFinal,
    isExcluindoEtapaFinal
  } = useProcessoSeletivoAdmin();

  const [form, setForm] = useState({
    tema_id: '',
    tema_redacao: '',
    instrucoes: '',
    data_inicio: '',
    hora_inicio: '',
    data_fim: '',
    hora_fim: '',
    ativo: true
  });

  const [buscaTema, setBuscaTema] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const initialLoadDone = useRef(false);

  // Buscar TODOS os temas - sem depender de buscaTema na queryKey
  const { data: todosTemas, isLoading: loadingTemas } = useQuery({
    queryKey: ['ps-admin-temas-etapa-final-all'],
    queryFn: async (): Promise<TemaOption[]> => {
      const { data, error } = await supabase
        .from('temas')
        .select('id, frase_tematica, eixo_tematico, status')
        .order('published_at', { ascending: false, nullsFirst: false })
        .order('id', { ascending: false })
        .limit(200);

      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000
  });

  // Filtrar temas localmente baseado na busca
  const temasFiltrados = useMemo(() => {
    if (!todosTemas) return [];
    if (!buscaTema.trim()) return todosTemas;
    const termoBusca = buscaTema.toLowerCase();
    return todosTemas.filter(tema =>
      tema.frase_tematica.toLowerCase().includes(termoBusca)
    );
  }, [todosTemas, buscaTema]);

  const temaEscolhido = todosTemas?.find(tema => tema.id === form.tema_id);

  // Inicializar formulário apenas na primeira carga ou quando etapa é excluída
  useEffect(() => {
    // Primeira carga: inicializar com dados existentes
    if (etapaFinal && !initialLoadDone.current) {
      initialLoadDone.current = true;
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
      setIsEditing(true); // Já existe configuração, então está em modo edição
    }
    // Resetar form quando etapa final é excluída
    else if (!etapaFinal && initialLoadDone.current) {
      initialLoadDone.current = false;
      setIsEditing(false);
      setForm({
        tema_id: '',
        tema_redacao: '',
        instrucoes: '',
        data_inicio: '',
        hora_inicio: '',
        data_fim: '',
        hora_fim: '',
        ativo: true
      });
    }
  }, [etapaFinal]);

  const handleExcluir = () => {
    if (etapaFinal?.id) {
      excluirEtapaFinal(etapaFinal.id);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validar campos obrigatórios
    if (!form.tema_id) {
      toast.error('Selecione um tema para a redação');
      return;
    }
    if (!form.data_inicio || !form.hora_inicio) {
      toast.error('Preencha a data e horário de início');
      return;
    }
    if (!form.data_fim || !form.hora_fim) {
      toast.error('Preencha a data e horário de encerramento');
      return;
    }

    const temaSelecionado = todosTemas?.find(t => t.id === form.tema_id);

    console.log('Salvando etapa final:', {
      id: etapaFinal?.id,
      tema_id: form.tema_id,
      isEditing: !!etapaFinal?.id
    });

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
                    {temasFiltrados.length === 0 ? (
                      <div className="p-2 text-sm text-gray-500 text-center">
                        Nenhum tema encontrado
                      </div>
                    ) : (
                      temasFiltrados.map((tema) => (
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
                      ))
                    )}
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

          <div className="pt-4 flex items-center gap-3">
            <Button
              type="submit"
              disabled={isSalvandoEtapaFinal}
              className={etapaFinal ? "bg-green-600 hover:bg-green-700" : ""}
            >
              {etapaFinal ? (
                <>
                  <Edit className="h-4 w-4 mr-2" />
                  Salvar Alterações
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Criar Configuração
                </>
              )}
            </Button>

            {etapaFinal && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={isExcluindoEtapaFinal}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Excluir Configuração
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir Etapa Final?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Tem certeza que deseja excluir a configuração da etapa final?
                      Esta ação não pode ser desfeita.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleExcluir}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Sim, excluir
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default PSEtapaFinalConfig;
