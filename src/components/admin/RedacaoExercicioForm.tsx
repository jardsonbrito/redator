
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

type RedacaoExercicio = {
  id: string;
  nome_aluno: string;
  email_aluno: string;
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
  id_exercicio: string;
};

export const RedacaoExercicioForm = () => {
  const [selectedRedacao, setSelectedRedacao] = useState<RedacaoExercicio | null>(null);
  const [viewRedacao, setViewRedacao] = useState<RedacaoExercicio | null>(null);
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
    queryKey: ['redacoes-exercicios'],
    queryFn: async () => {
      console.log('🔍 Buscando redações de exercícios...');
      const { data, error } = await supabase
        .from('redacoes_enviadas')
        .select('*')
        .not('id_exercicio', 'is', null)
        .order('data_envio', { ascending: false });
      
      if (error) {
        console.error('❌ Erro ao buscar redações:', error);
        throw error;
      }
      
      console.log(`✅ ${data?.length || 0} redações de exercícios encontradas`);
      return data || [];
    },
  });

  const corrigirMutation = useMutation({
    mutationFn: async (dados: typeof formData) => {
      if (!selectedRedacao?.id) {
        throw new Error('ID da redação não encontrado');
      }

      const notas = {
        nota_c1: dados.nota_c1 ? parseInt(dados.nota_c1) : null,
        nota_c2: dados.nota_c2 ? parseInt(dados.nota_c2) : null,
        nota_c3: dados.nota_c3 ? parseInt(dados.nota_c3) : null,
        nota_c4: dados.nota_c4 ? parseInt(dados.nota_c4) : null,
        nota_c5: dados.nota_c5 ? parseInt(dados.nota_c5) : null,
      };

      const notaTotal = Object.values(notas).reduce((sum, nota) => sum + (nota || 0), 0);

      const { error } = await supabase
        .from('redacoes_enviadas')
        .update({
          ...notas,
          nota_total: notaTotal,
          comentario_admin: dados.comentario_admin?.trim() || null,
          corrigida: true,
          data_correcao: new Date().toISOString(),
        })
        .eq('id', selectedRedacao.id);
      
      if (error) throw error;
      return { notaTotal };
    },
    onSuccess: (result) => {
      toast({
        title: "Correção salva com sucesso!",
        description: `Redação corrigida com nota total de ${result.notaTotal}/1000 pontos.`,
      });
      
      queryClient.invalidateQueries({ queryKey: ['redacoes-exercicios'] });
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

  const handleEdit = (redacao: RedacaoExercicio) => {
    setSelectedRedacao(redacao);
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

  const handleView = (redacao: RedacaoExercicio) => {
    setViewRedacao(redacao);
    setIsViewDialogOpen(true);
  };

  const handleNotaChange = (competencia: string, valor: string) => {
    let nota = '';
    if (valor !== '') {
      const valorNumerico = parseInt(valor);
      if (!isNaN(valorNumerico)) {
        nota = Math.min(200, Math.max(0, valorNumerico)).toString();
      }
    }
    
    const newFormData = { ...formData, [competencia]: nota };
    
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
  };

  const copiarCorrecao = async (redacao: RedacaoExercicio) => {
    const correcaoTexto = `
CORREÇÃO DE REDAÇÃO - EXERCÍCIO

Nome do Aluno: ${redacao.nome_aluno}
E-mail: ${redacao.email_aluno}
Frase Temática: ${redacao.frase_tematica}

NOTAS POR COMPETÊNCIA:
• Competência 1: ${redacao.nota_c1 || 0}/200
• Competência 2: ${redacao.nota_c2 || 0}/200
• Competência 3: ${redacao.nota_c3 || 0}/200
• Competência 4: ${redacao.nota_c4 || 0}/200
• Competência 5: ${redacao.nota_c5 || 0}/200

NOTA FINAL: ${redacao.nota_total || 0}/1000

CORREÇÃO PEDAGÓGICA:
${redacao.comentario_admin || 'Nenhum comentário adicional.'}
    `.trim();

    try {
      await navigator.clipboard.writeText(correcaoTexto);
      toast({
        title: "Correção copiada!",
        description: "A correção completa foi copiada para a área de transferência.",
      });
    } catch (err) {
      const textArea = document.createElement('textarea');
      textArea.value = correcaoTexto;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      
      toast({
        title: "Correção copiada!",
        description: "A correção completa foi copiada para a área de transferência.",
      });
    }
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedRedacao?.id) {
      toast({
        title: "Erro",
        description: "Nenhuma redação selecionada.",
        variant: "destructive",
      });
      return;
    }

    const temNota = formData.nota_c1 || formData.nota_c2 || formData.nota_c3 || formData.nota_c4 || formData.nota_c5;
    if (!temNota) {
      toast({
        title: "Erro de validação",
        description: "É necessário preencher pelo menos uma competência.",
        variant: "destructive",
      });
      return;
    }

    corrigirMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-redator-accent mx-auto mb-4"></div>
        <p className="text-redator-accent">Carregando redações de exercícios...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-redator-primary mb-4">
          Redações Enviadas via Exercícios ({redacoes?.length || 0})
        </h3>
        
        {redacoes && redacoes.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            {redacoes.map((redacao) => (
              <Card key={redacao.id} className="border-redator-accent/20">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h4 className="font-medium text-redator-primary mb-2">
                        {redacao.nome_aluno}
                      </h4>
                      <p className="text-sm text-redator-accent mb-1">
                        📧 {redacao.email_aluno}
                      </p>
                      <p className="text-sm text-redator-accent mb-2 line-clamp-2">
                        📝 {redacao.frase_tematica}
                      </p>
                      
                      <div className="flex items-center gap-4 text-sm text-redator-accent mb-2">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {formatDate(redacao.data_envio)}
                        </div>
                        
                        {redacao.corrigida ? (
                          <Badge className="bg-green-100 text-green-800">Corrigida</Badge>
                        ) : (
                          <Badge className="bg-yellow-100 text-yellow-800">Aguardando</Badge>
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

                      {redacao.corrigida && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => copiarCorrecao(redacao)}
                          className="border-blue-300 text-blue-600 hover:bg-blue-50"
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      )}

                      <Button 
                        onClick={() => handleEdit(redacao)}
                        variant={redacao.corrigida ? "outline" : "default"}
                        size="sm"
                        className={!redacao.corrigida ? "bg-redator-primary hover:bg-redator-primary/90" : ""}
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        {redacao.corrigida ? "Editar" : "Corrigir"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-redator-accent">Nenhuma redação de exercício encontrada.</p>
          </div>
        )}
      </div>

      {/* Dialog de visualização */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{viewRedacao?.nome_aluno} - {viewRedacao?.frase_tematica}</DialogTitle>
          </DialogHeader>
          {viewRedacao && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>Nome:</strong> {viewRedacao.nome_aluno}
                </div>
                <div>
                  <strong>E-mail:</strong> {viewRedacao.email_aluno}
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg border border-redator-accent/20">
                <h4 className="font-medium text-redator-primary mb-2">Texto da Redação:</h4>
                <p className="whitespace-pre-wrap text-sm leading-relaxed">
                  {viewRedacao.redacao_texto}
                </p>
              </div>

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
                      <h5 className="font-medium text-blue-800 mb-2">Correção Pedagógica:</h5>
                      <p className="text-sm text-blue-700">{viewRedacao.comentario_admin}</p>
                    </div>
                  )}

                  <Button 
                    onClick={() => copiarCorrecao(viewRedacao)}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copiar Correção Completa
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Formulário de correção */}
      {selectedRedacao && (
        <Card className="border-redator-primary/30">
          <CardHeader>
            <CardTitle className="text-redator-primary">
              Corrigindo: {selectedRedacao.nome_aluno} - {selectedRedacao.frase_tematica}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-6">
              <h4 className="font-medium text-redator-primary mb-2">Texto da Redação:</h4>
              <div className="bg-gray-50 p-4 rounded-lg border border-redator-accent/20 max-h-60 overflow-y-auto">
                <p className="whitespace-pre-wrap text-sm leading-relaxed">
                  {selectedRedacao.redacao_texto}
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
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

              <div>
                <label className="block text-sm font-medium text-redator-primary mb-1">
                  Correção Pedagógica Detalhada
                </label>
                <Textarea
                  placeholder="Escreva aqui suas observações, dicas e orientações para o aluno..."
                  value={formData.comentario_admin}
                  onChange={(e) => setFormData(prev => ({ ...prev, comentario_admin: e.target.value }))}
                  className="min-h-[120px] border-redator-accent/30 focus:border-redator-accent"
                />
              </div>

              <div className="flex gap-3">
                <Button 
                  type="submit" 
                  disabled={corrigirMutation.isPending}
                  className="bg-redator-primary hover:bg-redator-primary/90 text-white"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {corrigirMutation.isPending ? "Salvando..." : "Salvar Correção"}
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
