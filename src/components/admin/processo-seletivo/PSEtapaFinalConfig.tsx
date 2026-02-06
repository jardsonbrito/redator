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
import { FileText, Save, Calendar, Clock, Search, Trash2, Edit, Gift, ExternalLink } from 'lucide-react';
import { useProcessoSeletivoAdminComContexto } from '@/contexts/ProcessoSeletivoAdminContext';
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
  } = useProcessoSeletivoAdminComContexto();

  const [form, setForm] = useState({
    tipo: 'redacao' as 'redacao' | 'mensagem_bolsa',
    tema_id: '',
    tema_redacao: '',
    instrucoes: '',
    data_inicio: '',
    hora_inicio: '',
    data_fim: '',
    hora_fim: '',
    ativo: true,
    mensagem_bolsa: '',
    link_cta: '',
    texto_botao_cta: ''
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
        tipo: etapaFinal.tipo || 'redacao',
        tema_id: etapaFinal.tema_id || '',
        tema_redacao: etapaFinal.tema_redacao || '',
        instrucoes: etapaFinal.instrucoes || '',
        data_inicio: etapaFinal.data_inicio || '',
        hora_inicio: etapaFinal.hora_inicio || '',
        data_fim: etapaFinal.data_fim || '',
        hora_fim: etapaFinal.hora_fim || '',
        ativo: etapaFinal.ativo,
        mensagem_bolsa: etapaFinal.mensagem_bolsa || '',
        link_cta: etapaFinal.link_cta || '',
        texto_botao_cta: etapaFinal.texto_botao_cta || ''
      });
      setIsEditing(true); // Já existe configuração, então está em modo edição
    }
    // Resetar form quando etapa final é excluída
    else if (!etapaFinal && initialLoadDone.current) {
      initialLoadDone.current = false;
      setIsEditing(false);
      setForm({
        tipo: 'redacao',
        tema_id: '',
        tema_redacao: '',
        instrucoes: '',
        data_inicio: '',
        hora_inicio: '',
        data_fim: '',
        hora_fim: '',
        ativo: true,
        mensagem_bolsa: '',
        link_cta: '',
        texto_botao_cta: ''
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

    if (form.tipo === 'redacao') {
      // Validar campos obrigatórios para redação
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

      salvarEtapaFinal({
        id: etapaFinal?.id,
        tipo: 'redacao',
        tema_id: form.tema_id,
        tema_redacao: temaSelecionado?.frase_tematica || form.tema_redacao,
        instrucoes: form.instrucoes || undefined,
        data_inicio: form.data_inicio,
        hora_inicio: form.hora_inicio,
        data_fim: form.data_fim,
        hora_fim: form.hora_fim,
        ativo: form.ativo
      });
    } else {
      // Validar campos obrigatórios para mensagem de bolsa
      if (!form.mensagem_bolsa.trim()) {
        toast.error('Preencha a mensagem de parabéns para os candidatos');
        return;
      }

      salvarEtapaFinal({
        id: etapaFinal?.id,
        tipo: 'mensagem_bolsa',
        mensagem_bolsa: form.mensagem_bolsa,
        link_cta: form.link_cta || undefined,
        texto_botao_cta: form.texto_botao_cta || undefined,
        ativo: form.ativo
      });
    }
  };

  // Verificar status da janela (só para tipo redacao)
  const verificarJanela = () => {
    if (form.tipo !== 'redacao' || !form.data_inicio || !form.hora_inicio || !form.data_fim || !form.hora_fim) {
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
            Configuração da Etapa Final
          </div>
          {form.tipo === 'redacao' && statusJanela.color && (
            <Badge className={`${statusJanela.color} text-white`}>
              {statusJanela.label}
            </Badge>
          )}
          {form.tipo === 'mensagem_bolsa' && (
            <Badge className="bg-emerald-500 text-white">
              Mensagem de Bolsa
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

          {/* Seletor de Tipo */}
          <div className="border rounded-lg p-4 bg-muted/30">
            <Label className="mb-2 block font-medium">Tipo da Etapa Final *</Label>
            <Select
              value={form.tipo}
              onValueChange={(value: 'redacao' | 'mensagem_bolsa') => setForm({ ...form, tipo: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="redacao">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    <span>Redação</span>
                  </div>
                </SelectItem>
                <SelectItem value="mensagem_bolsa">
                  <div className="flex items-center gap-2">
                    <Gift className="h-4 w-4" />
                    <span>Mensagem de Bolsa</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500 mt-2">
              {form.tipo === 'redacao'
                ? 'O candidato deverá enviar uma redação dentro da janela de tempo configurada.'
                : 'O candidato verá uma mensagem de parabéns e poderá concluir o processo sem enviar redação.'}
            </p>
          </div>

          {/* === CAMPOS PARA TIPO REDAÇÃO === */}
          {form.tipo === 'redacao' && (
            <>
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
            </>
          )}

          {/* === CAMPOS PARA TIPO MENSAGEM DE BOLSA === */}
          {form.tipo === 'mensagem_bolsa' && (
            <div className="border rounded-lg p-4 bg-emerald-50/50 space-y-4">
              <h4 className="font-medium flex items-center gap-2 text-emerald-700">
                <Gift className="h-4 w-4" />
                Mensagem de Parabéns *
              </h4>
              <Textarea
                id="mensagem_bolsa"
                value={form.mensagem_bolsa}
                onChange={(e) => setForm({ ...form, mensagem_bolsa: e.target.value })}
                placeholder="Parabéns! Você foi contemplado(a) com uma bolsa de estudos no Laboratório do Redator..."
                rows={6}
              />
              <p className="text-xs text-gray-500">
                Esta mensagem será exibida para os candidatos aprovados ao acessarem a etapa final.
                Eles precisarão clicar em "Confirmar e Concluir" para finalizar o processo.
              </p>

              {form.mensagem_bolsa && (
                <div className="p-4 bg-white rounded-lg border border-emerald-200">
                  <h5 className="font-medium text-sm text-emerald-700 mb-2">Preview da mensagem:</h5>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{form.mensagem_bolsa}</p>
                </div>
              )}

              {/* Link CTA (WhatsApp ou outro) */}
              <div className="border-t border-emerald-200 pt-4 space-y-3">
                <h4 className="font-medium flex items-center gap-2 text-emerald-700">
                  <ExternalLink className="h-4 w-4" />
                  Botão de Ação (opcional)
                </h4>
                <p className="text-xs text-gray-500">
                  Adicione um botão com link (ex: WhatsApp) para que o candidato possa entrar em contato após a confirmação.
                  O botão aparecerá no card de parabéns e também na tela de conclusão.
                </p>
                <div>
                  <Label htmlFor="link_cta">Link do botão (URL)</Label>
                  <Input
                    id="link_cta"
                    value={form.link_cta}
                    onChange={(e) => setForm({ ...form, link_cta: e.target.value })}
                    placeholder="https://wa.me/5585992160605?text=Olá!%20Fui%20aprovado(a)..."
                  />
                </div>
                <div>
                  <Label htmlFor="texto_botao_cta">Texto do botão</Label>
                  <Input
                    id="texto_botao_cta"
                    value={form.texto_botao_cta}
                    onChange={(e) => setForm({ ...form, texto_botao_cta: e.target.value })}
                    placeholder="Falar no WhatsApp"
                  />
                </div>
              </div>
            </div>
          )}

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
