
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Eye, Save, Calendar, Award, Copy, Edit } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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
};

export const RedacaoEnviadaForm = () => {
  const [selectedRedacao, setSelectedRedacao] = useState<RedacaoEnviada | null>(null);
  const [viewRedacao, setViewRedacao] = useState<RedacaoEnviada | null>(null);
  const [editingRedacao, setEditingRedacao] = useState<RedacaoEnviada | null>(null);
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

  const { data: redacoes, isLoading } = useQuery({
    queryKey: ['redacoes-enviadas-admin'],
    queryFn: async () => {
      console.log('Buscando redações para admin...');
      const { data, error } = await supabase
        .from('redacoes_enviadas')
        .select('*')
        .order('data_envio', { ascending: false });
      
      if (error) {
        console.error('Erro ao buscar redações:', error);
        throw error;
      }
      
      return data || [];
    },
  });

  const corrigirMutation = useMutation({
    mutationFn: async (dados: any) => {
      console.log('Salvando correção com dados:', dados);
      const { error } = await supabase
        .from('redacoes_enviadas')
        .update({
          nota_c1: dados.nota_c1 ? parseInt(dados.nota_c1) : null,
          nota_c2: dados.nota_c2 ? parseInt(dados.nota_c2) : null,
          nota_c3: dados.nota_c3 ? parseInt(dados.nota_c3) : null,
          nota_c4: dados.nota_c4 ? parseInt(dados.nota_c4) : null,
          nota_c5: dados.nota_c5 ? parseInt(dados.nota_c5) : null,
          nota_total: dados.nota_total ? parseInt(dados.nota_total) : null,
          comentario_admin: dados.comentario_admin || null,
          corrigida: true,
          data_correcao: new Date().toISOString(),
        })
        .eq('id', selectedRedacao?.id || editingRedacao?.id);

      if (error) {
        console.error('Erro ao salvar correção:', error);
        throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: "Correção salva com sucesso!",
        description: "A redação foi corrigida e as notas foram atualizadas.",
      });
      queryClient.invalidateQueries({ queryKey: ['redacoes-enviadas-admin'] });
      queryClient.invalidateQueries({ queryKey: ['redacoes-enviadas'] });
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
    },
    onError: (error) => {
      console.error('Erro ao salvar correção:', error);
      toast({
        title: "Erro ao salvar correção",
        description: "Ocorreu um erro ao salvar a correção. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const handleEdit = (redacao: RedacaoEnviada) => {
    console.log('Clicou em corrigir redação:', redacao.id);
    setSelectedRedacao(redacao);
    setEditingRedacao(null);
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

  const handleEditExisting = (redacao: RedacaoEnviada) => {
    console.log('Editando correção existente:', redacao.id);
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
    console.log('Visualizando redação:', redacao.id);
    setViewRedacao(redacao);
    setIsViewDialogOpen(true);
  };

  const handleNotaChange = (competencia: string, valor: string) => {
    console.log(`Alterando ${competencia} para:`, valor);
    
    // Limitar valores entre 0 e 200
    const nota = Math.min(200, Math.max(0, parseInt(valor) || 0));
    const valorFormatado = nota.toString();
    
    const newFormData = { ...formData, [competencia]: valorFormatado };
    
    // Calcular automaticamente a nota total
    const notas = [
      parseInt(newFormData.nota_c1) || 0,
      parseInt(newFormData.nota_c2) || 0,
      parseInt(newFormData.nota_c3) || 0,
      parseInt(newFormData.nota_c4) || 0,
      parseInt(newFormData.nota_c5) || 0,
    ];
    const total = notas.reduce((sum, nota) => sum + nota, 0);
    
    setFormData({
      ...newFormData,
      nota_total: total.toString()
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRedacao && !editingRedacao) {
      console.log('Nenhuma redação selecionada');
      return;
    }

    console.log('Salvando correção:', formData);
    corrigirMutation.mutate(formData);
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

  const copiarPromptCorrecao = async (redacao: RedacaoEnviada) => {
    const prompt = `Corrija a seguinte redação conforme os critérios do ENEM, atribuindo nota de 0 a 200 por competência (C1 a C5) e justificando cada uma. Utilize linguagem objetiva, mas pedagógica.

Frase temática: "${redacao.frase_tematica}"

Redação do aluno:
${redacao.redacao_texto}`;

    try {
      await navigator.clipboard.writeText(prompt);
      toast({
        title: "Texto copiado!",
        description: "O prompt de correção foi copiado para a área de transferência.",
      });
    } catch (err) {
      // Fallback para dispositivos que não suportam navigator.clipboard
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
      {/* Lista de redações */}
      <div>
        <h3 className="text-lg font-semibold text-redator-primary mb-4">
          Redações Enviadas ({redacoes?.length || 0})
        </h3>
        
        {redacoes && redacoes.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            {redacoes.map((redacao) => (
              <Card key={redacao.id} className="border-redator-accent/20">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h4 className="font-medium text-redator-primary mb-2 line-clamp-2">
                        {redacao.frase_tematica}
                      </h4>
                      
                      <div className="flex items-center gap-4 text-sm text-redator-accent mb-2">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {formatDate(redacao.data_envio)}
                        </div>
                        
                        {redacao.corrigida ? (
                          <Badge className="bg-green-100 text-green-800">Corrigida</Badge>
                        ) : (
                          <Badge className="bg-yellow-100 text-yellow-800">Pendente</Badge>
                        )}
                      </div>

                      {redacao.corrigida && redacao.nota_total !== null && (
                        <div className="flex items-center gap-2">
                          <Award className="w-4 h-4 text-redator-accent" />
                          <span className="text-sm text-redator-accent">Nota Total: {redacao.nota_total}/1000</span>
                        </div>
                      )}
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
                        onClick={() => {
                          console.log('Botão corrigir clicado para redação:', redacao.id);
                          handleEdit(redacao);
                        }}
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
            <p className="text-redator-accent">Nenhuma redação encontrada.</p>
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
              
              {/* Botão de cópia também no dialog de visualização */}
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
              
              {/* Botão de cópia no formulário de correção */}
              <Button 
                onClick={() => copiarPromptCorrecao(selectedRedacao || editingRedacao!)}
                variant="outline"
                className="border-blue-300 text-blue-600 hover:bg-blue-50"
              >
                <Copy className="w-4 h-4 mr-2" />
                Copiar para correção
              </Button>
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
                        step="40"
                        placeholder="0-200"
                        value={formData[comp.key as keyof typeof formData]}
                        onChange={(e) => handleNotaChange(comp.key, e.target.value)}
                        className="w-full border-redator-accent/30 focus:border-redator-accent bg-white"
                      />
                      <p className="text-xs text-redator-accent mt-1">
                        Valores: 0, 40, 80, 120, 160, 200
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Nota total - calculada automaticamente */}
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
                  onClick={() => {
                    console.log('Cancelando correção');
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
                  }}
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
