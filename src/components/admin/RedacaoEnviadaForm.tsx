import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Eye, Save, Calendar, Award, Copy, Edit, User, Mail, Filter } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRedacaoCorrecaoHandler, type CorrecaoData } from "./RedacaoCorrecaoHandler";

type RedacaoEnviada = {
  id: string;
  frase_tematica: string;
  redacao_texto: string;
  data_envio: string;
  nota_c1: number | null;
  nota_c2: number | null;
  nota_c3: number | null;
  nota_c4: number | null;
  nota_c5: number | null;
  nota_total: number | null;
  comentario_admin: string | null;
  corrigida: boolean;
  data_correcao: string | null;
  nome_aluno: string | null;
  email_aluno: string | null;
  tipo_envio: string | null;
  status: string | null;
  turma: string | null;
};

export const RedacaoEnviadaForm = () => {
  const [selectedRedacao, setSelectedRedacao] = useState<RedacaoEnviada | null>(null);
  const [viewRedacao, setViewRedacao] = useState<RedacaoEnviada | null>(null);
  const [editingRedacao, setEditingRedacao] = useState<RedacaoEnviada | null>(null);
  const [filtroTipo, setFiltroTipo] = useState<string>("todos");
  const [filtroStatus, setFiltroStatus] = useState<string>("todos");
  const [filtroTurma, setFiltroTurma] = useState<string>("todas");
  const [formData, setFormData] = useState({
    nota_c1: '',
    nota_c2: '',
    nota_c3: '',
    nota_c4: '',
    nota_c5: '',
    nota_total: '',
    comentario_admin: '',
  });
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { executarCorrecao } = useRedacaoCorrecaoHandler();

  const { data: redacoes, isLoading } = useQuery({
    queryKey: ['redacoes-enviadas-admin'],
    queryFn: async () => {
      console.log('🔍 Buscando redações para admin...');
      const { data, error } = await supabase
        .from('redacoes_enviadas')
        .select('*')
        .order('data_envio', { ascending: false });
      
      if (error) {
        console.error('❌ Erro ao buscar redações:', error);
        throw error;
      }
      
      console.log(`✅ ${data?.length || 0} redações encontradas`);
      return data || [];
    },
  });

  const corrigirMutation = useMutation({
    mutationFn: async (dados: CorrecaoData) => {
      const redacaoAtual = selectedRedacao || editingRedacao;
      
      if (!redacaoAtual?.id) {
        throw new Error('ID da redação não encontrado');
      }

      console.log('🚀 Iniciando correção para redação:', redacaoAtual.id);
      
      const resultado = await executarCorrecao(redacaoAtual.id, dados);
      
      if (!resultado.success) {
        throw new Error(resultado.error || 'Erro desconhecido na correção');
      }

      return resultado;
    },
    onSuccess: (result) => {
      console.log('🎉 Correção concluída com sucesso:', result);
      
      toast({
        title: "Correção salva com sucesso!",
        description: `Redação corrigida com nota total de ${result.notaTotal}/1000 pontos.`,
      });
      
      // Invalidar queries para atualizar a interface
      queryClient.invalidateQueries({ queryKey: ['redacoes-enviadas-admin'] });
      queryClient.invalidateQueries({ queryKey: ['redacoes-enviadas'] });
      
      resetForm();
    },
    onError: (error: Error) => {
      console.error('💥 Erro na correção:', error);
      toast({
        title: "Erro ao salvar correção",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setSelectedRedacao(null);
    setEditingRedacao(null);
    setFormData({
      nota_c1: '',
      nota_c2: '',
      nota_c3: '',
      nota_c4: '',
      nota_c5: '',
      nota_total: '',
      comentario_admin: '',
    });
  };

  // Aplicar filtros
  const redacoesFiltradas = redacoes?.filter(redacao => {
    if (filtroTipo !== "todos" && redacao.tipo_envio !== filtroTipo) return false;
    if (filtroStatus !== "todos") {
      if (filtroStatus === "corrigida" && !redacao.corrigida) return false;
      if (filtroStatus === "aguardando" && redacao.corrigida) return false;
    }
    if (filtroTurma !== "todas" && redacao.turma !== filtroTurma) return false;
    return true;
  }) || [];

  // Extrair turmas únicas para o filtro
  const turmasUnicas = [...new Set(redacoes?.map(r => r.turma).filter(Boolean))];

  const handleEdit = (redacao: RedacaoEnviada) => {
    console.log('✏️ Iniciando correção de redação:', redacao.id);
    
    if (!redacao?.id) {
      toast({
        title: "Erro",
        description: "Redação inválida. Não é possível corrigir.",
        variant: "destructive",
      });
      return;
    }

    setSelectedRedacao(redacao);
    setEditingRedacao(null);
    setFormData({
      nota_c1: '',
      nota_c2: '',
      nota_c3: '',
      nota_c4: '',
      nota_c5: '',
      nota_total: '',
      comentario_admin: '',
    });
  };

  const handleEditExisting = (redacao: RedacaoEnviada) => {
    console.log('📝 Editando correção existente:', redacao.id);
    
    if (!redacao?.id) {
      toast({
        title: "Erro",
        description: "Redação inválida. Não é possível editar.",
        variant: "destructive",
      });
      return;
    }

    setEditingRedacao(redacao);
    setSelectedRedacao(null);
    setFormData({
      nota_c1: redacao.nota_c1?.toString() || '',
      nota_c2: redacao.nota_c2?.toString() || '',
      nota_c3: redacao.nota_c3?.toString() || '',
      nota_c4: redacao.nota_c4?.toString() || '',
      nota_c5: redacao.nota_c5?.toString() || '',
      nota_total: redacao.nota_total?.toString() || '',
      comentario_admin: redacao.comentario_admin || '',
    });
  };

  const handleView = (redacao: RedacaoEnviada) => {
    console.log('👁️ Visualizando redação:', redacao);
    setViewRedacao(redacao);
    setIsViewDialogOpen(true);
  };

  const handleNotaChange = (competencia: string, valor: string) => {
    console.log(`📊 Alterando ${competencia}:`, valor);
    
    // Permitir string vazia ou números válidos
    let nota = '';
    if (valor !== '') {
      const valorNumerico = parseInt(valor);
      if (!isNaN(valorNumerico)) {
        nota = Math.min(200, Math.max(0, valorNumerico)).toString();
      }
    }
    
    const newFormData = { ...formData, [competencia]: nota };
    
    // Calcular total apenas com valores válidos
    const total = [
      newFormData.nota_c1,
      newFormData.nota_c2,
      newFormData.nota_c3,
      newFormData.nota_c4,
      newFormData.nota_c5,
    ].reduce((sum, n) => {
      const num = parseInt(n) || 0;
      return sum + num;
    }, 0);
    
    setFormData({
      ...newFormData,
      nota_total: total.toString()
    });

    console.log('📈 Novas notas:', newFormData, 'Total:', total);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTipoEnvioLabel = (tipo: string | null) => {
    if (!tipo) return "Regular";
    const tipos = {
      'regular': 'Regular',
      'exercicio': 'Exercício',
      'simulado': 'Simulado',
      'visitante': 'Visitante'
    };
    return tipos[tipo as keyof typeof tipos] || tipo;
  };

  const getTipoEnvioColor = (tipo: string | null) => {
    if (!tipo || tipo === 'regular') return "bg-blue-100 text-blue-800";
    if (tipo === 'exercicio') return "bg-purple-100 text-purple-800";
    if (tipo === 'simulado') return "bg-orange-100 text-orange-800";
    if (tipo === 'visitante') return "bg-gray-100 text-gray-800";
    return "bg-blue-100 text-blue-800";
  };

  const copiarPromptCorrecao = async (redacao: RedacaoEnviada) => {
    const prompt = `Corrija a seguinte redação conforme os critérios do ENEM, atribuindo nota de 0 a 200 por competência (C1 a C5) e justificando cada uma. Utilize linguagem objetiva, mas pedagógica.

Frase temática: "${redacao.frase_tematica}"

Autor: ${redacao.nome_aluno || 'Não informado'}
E-mail: ${redacao.email_aluno || 'Não informado'}
Tipo de envio: ${getTipoEnvioLabel(redacao.tipo_envio)}
${redacao.turma && redacao.turma !== 'visitante' ? `Turma: ${redacao.turma}` : ''}

Redação do aluno:
${redacao.redacao_texto}`;

    try {
      await navigator.clipboard.writeText(prompt);
      toast({
        title: "Texto copiado!",
        description: "O prompt de correção foi copiado para a área de transferência.",
      });
    } catch (err) {
      const textArea = document.createElement('textarea');
      textArea.value = prompt;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      
      toast({
        title: "Texto copiado!",
        description: "O prompt de correção foi copiado para a área de transferência.",
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const redacaoAtual = selectedRedacao || editingRedacao;
    
    console.log('🚀 Submetendo formulário:', {
      redacaoId: redacaoAtual?.id,
      formData: formData
    });
    
    if (!redacaoAtual?.id) {
      toast({
        title: "Erro",
        description: "Nenhuma redação selecionada ou ID inválido.",
        variant: "destructive",
      });
      return;
    }

    // Verificar se pelo menos uma nota foi preenchida
    const temNota = formData.nota_c1 || formData.nota_c2 || formData.nota_c3 || formData.nota_c4 || formData.nota_c5;
    if (!temNota) {
      toast({
        title: "Erro de validação",
        description: "É necessário preencher pelo menos uma competência.",
        variant: "destructive",
      });
      return;
    }

    console.log('✅ Validação OK, enviando correção...');
    corrigirMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-redator-accent mx-auto mb-4"></div>
        <p className="text-redator-accent">Carregando redações para correção...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <Card className="border-redator-accent/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-redator-primary">
            <Filter className="w-5 h-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-redator-primary mb-2">Tipo de Envio</label>
              <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os tipos</SelectItem>
                  <SelectItem value="regular">Regular</SelectItem>
                  <SelectItem value="exercicio">Exercício</SelectItem>
                  <SelectItem value="simulado">Simulado</SelectItem>
                  <SelectItem value="visitante">Visitante</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-redator-primary mb-2">Status</label>
              <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os status</SelectItem>
                  <SelectItem value="aguardando">Aguardando correção</SelectItem>
                  <SelectItem value="corrigida">Corrigidas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-redator-primary mb-2">Turma</label>
              <Select value={filtroTurma} onValueChange={setFiltroTurma}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas as turmas</SelectItem>
                  {turmasUnicas.map(turma => (
                    <SelectItem key={turma} value={turma!}>{turma}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de redações */}
      <div>
        <h3 className="text-lg font-semibold text-redator-primary mb-4">
          Redações Enviadas ({redacoesFiltradas.length})
        </h3>
        
        {redacoesFiltradas.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            {redacoesFiltradas.map((redacao) => (
              <Card key={redacao.id} className="border-redator-accent/20">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h4 className="font-medium text-redator-primary mb-2 line-clamp-2">
                        {redacao.frase_tematica}
                      </h4>
                      
                      {/* Informações do autor */}
                      <div className="space-y-1 text-sm text-redator-accent mb-3">
                        {redacao.nome_aluno && (
                          <div className="flex items-center gap-2">
                            <User className="w-3 h-3" />
                            <span>{redacao.nome_aluno}</span>
                          </div>
                        )}
                        {redacao.email_aluno && (
                          <div className="flex items-center gap-2">
                            <Mail className="w-3 h-3" />
                            <span>{redacao.email_aluno}</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-redator-accent mb-2 flex-wrap">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {formatDate(redacao.data_envio)}
                        </div>
                        
                        <Badge className={getTipoEnvioColor(redacao.tipo_envio)}>
                          {getTipoEnvioLabel(redacao.tipo_envio)}
                        </Badge>
                        
                        {redacao.corrigida ? (
                          <Badge className="bg-green-100 text-green-800">Corrigida</Badge>
                        ) : (
                          <Badge className="bg-yellow-100 text-yellow-800">Aguardando</Badge>
                        )}

                        {redacao.turma && redacao.turma !== 'visitante' && (
                          <Badge variant="outline">{redacao.turma}</Badge>
                        )}
                      </div>

                      {redacao.corrigida && redacao.nota_total !== null && (
                        <div className="flex items-center gap-2">
                          <Award className="w-4 h-4 text-redator-accent" />
                          <span className="text-sm text-redator-accent">Nota Total: {redacao.nota_total}/1000</span>
                        </div>
                      )}
                      
                      <div className="text-xs text-gray-500 mt-1">
                        ID: {redacao.id}
                      </div>
                    </div>

                    <div className="flex gap-2 flex-wrap">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleView(redacao)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>

                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => copiarPromptCorrecao(redacao)}
                        className="border-blue-300 text-blue-600 hover:bg-blue-50"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>

                      {redacao.corrigida && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleEditExisting(redacao)}
                          className="border-orange-300 text-orange-600 hover:bg-orange-50"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      )}

                      <Button 
                        onClick={() => handleEdit(redacao)}
                        variant={redacao.corrigida ? "outline" : "default"}
                        size="sm"
                        className={!redacao.corrigida ? "bg-redator-primary hover:bg-redator-primary/90" : ""}
                      >
                        {redacao.corrigida ? "Re-corrigir" : "Corrigir"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-redator-accent">Nenhuma redação encontrada com os filtros selecionados.</p>
          </div>
        )}
      </div>

      {/* Dialog de visualização */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{viewRedacao?.frase_tematica}</DialogTitle>
          </DialogHeader>
          {viewRedacao && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg border border-redator-accent/20">
                <h4 className="font-medium text-redator-primary mb-2">Texto da Redação:</h4>
                <p className="whitespace-pre-wrap text-sm leading-relaxed">
                  {viewRedacao.redacao_texto}
                </p>
              </div>

              {/* Exibir notas se corrigida */}
              {viewRedacao.corrigida && (
                <div className="space-y-4">
                  <h4 className="font-medium text-redator-primary">Correção:</h4>
                  
                  <div className="grid grid-cols-5 gap-4">
                    {[
                      { label: 'C1', value: viewRedacao.nota_c1 },
                      { label: 'C2', value: viewRedacao.nota_c2 },
                      { label: 'C3', value: viewRedacao.nota_c3 },
                      { label: 'C4', value: viewRedacao.nota_c4 },
                      { label: 'C5', value: viewRedacao.nota_c5 },
                    ].map((comp) => (
                      <div key={comp.label} className="text-center">
                        <div className="text-sm font-medium text-redator-primary mb-1">{comp.label}</div>
                        <div className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm font-medium">
                          {comp.value ?? '0'}/200
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Award className="w-5 h-5 text-green-600" />
                      <span className="font-medium text-green-800">Nota Total: {viewRedacao.nota_total ?? 0}/1000</span>
                    </div>
                  </div>

                  {viewRedacao.comentario_admin && (
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <h5 className="font-medium text-blue-800 mb-2">Dica de Escrita:</h5>
                      <p className="text-sm text-blue-700">{viewRedacao.comentario_admin}</p>
                    </div>
                  )}

                  {viewRedacao.data_correcao && (
                    <div className="text-sm text-gray-600">
                      Corrigida em: {formatDate(viewRedacao.data_correcao)}
                    </div>
                  )}
                </div>
              )}
              
              <Button 
                onClick={() => copiarPromptCorrecao(viewRedacao)}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                <Copy className="w-4 h-4 mr-2" />
                Copiar texto para correção
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Formulário de correção */}
      {(selectedRedacao || editingRedacao) && (
        <Card className="border-redator-primary/30">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <CardTitle className="text-redator-primary">
                {editingRedacao ? 'Editando Correção: ' : 'Corrigindo: '}
                {selectedRedacao?.frase_tematica || editingRedacao?.frase_tematica}
              </CardTitle>
              
              <Button 
                onClick={() => copiarPromptCorrecao(selectedRedacao || editingRedacao!)}
                variant="outline"
                className="border-blue-300 text-blue-600 hover:bg-blue-50"
              >
                <Copy className="w-4 h-4 mr-2" />
                Copiar para correção
              </Button>
            </div>
            
            <div className="text-xs text-gray-500">
              Corrigindo redação ID: {selectedRedacao?.id || editingRedacao?.id}
            </div>
          </CardHeader>
          <CardContent>
            {/* Exibir o texto da redação */}
            <div className="mb-6">
              <h4 className="font-medium text-redator-primary mb-2">Texto da Redação:</h4>
              <div className="bg-gray-50 p-4 rounded-lg border border-redator-accent/20 max-h-60 overflow-y-auto">
                <p className="whitespace-pre-wrap text-sm leading-relaxed">
                  {selectedRedacao?.redacao_texto || editingRedacao?.redacao_texto}
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Campos de notas por competência */}
              <div>
                <h4 className="font-medium text-redator-primary mb-3">Notas por Competência (0 a 200 pontos cada):</h4>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  {[
                    { key: 'nota_c1', label: 'Competência 1' },
                    { key: 'nota_c2', label: 'Competência 2' },
                    { key: 'nota_c3', label: 'Competência 3' },
                    { key: 'nota_c4', label: 'Competência 4' },
                    { key: 'nota_c5', label: 'Competência 5' },
                  ].map((comp) => (
                    <div key={comp.key}>
                      <label className="block text-sm font-medium text-redator-primary mb-2">
                        {comp.label}
                      </label>
                      <Input
                        type="number"
                        min="0"
                        max="200"
                        step="1"
                        placeholder="0-200"
                        value={formData[comp.key as keyof typeof formData]}
                        onChange={(e) => handleNotaChange(comp.key, e.target.value)}
                        className="w-full border-redator-accent/30 focus:border-redator-accent bg-white"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Nota total */}
              <div className="bg-redator-accent/5 p-4 rounded-lg border border-redator-accent/20">
                <label className="block text-sm font-medium text-redator-primary mb-2">
                  Nota Total (Calculada Automaticamente)
                </label>
                <div className="flex items-center gap-3">
                  <Input
                    type="text"
                    value={`${formData.nota_total || '0'}/1000`}
                    readOnly
                    className="bg-white border-redator-accent/30 font-semibold text-lg text-redator-primary"
                  />
                  <Award className="w-6 h-6 text-redator-accent" />
                </div>
              </div>

              {/* Comentário pedagógico */}
              <div>
                <label className="block text-sm font-medium text-redator-primary mb-1">
                  Dica de Escrita / Comentário Pedagógico
                </label>
                <Textarea
                  placeholder="Escreva aqui suas observações, dicas e orientações para o aluno..."
                  value={formData.comentario_admin}
                  onChange={(e) => setFormData(prev => ({ ...prev, comentario_admin: e.target.value }))}
                  className="min-h-[120px] border-redator-accent/30 focus:border-redator-accent"
                />
              </div>

              {/* Botões */}
              <div className="flex gap-3">
                <Button 
                  type="submit" 
                  disabled={corrigirMutation.isPending}
                  className="bg-redator-primary hover:bg-redator-primary/90 text-white"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {corrigirMutation.isPending ? "Salvando..." : (editingRedacao ? "Salvar Alterações" : "Salvar Correção")}
                </Button>
                
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={resetForm}
                  className="border-redator-accent/50"
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
