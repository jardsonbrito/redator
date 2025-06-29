
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Eye, Save, Calendar, Award } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

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
  const [formData, setFormData] = useState({
    nota_c1: '',
    nota_c2: '',
    nota_c3: '',
    nota_c4: '',
    nota_c5: '',
    nota_total: '',
    comentario_admin: '',
  });
  const [isDialogOpen, setIsDialogOpen] = useState(false);

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
        .eq('id', selectedRedacao?.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Correção salva com sucesso!",
        description: "A redação foi corrigida e as notas foram atualizadas.",
      });
      queryClient.invalidateQueries({ queryKey: ['redacoes-enviadas-admin'] });
      queryClient.invalidateQueries({ queryKey: ['redacoes-enviadas'] });
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRedacao) return;

    // Validar notas (devem ser múltiplos de 40 entre 0 e 200)
    const notas = [formData.nota_c1, formData.nota_c2, formData.nota_c3, formData.nota_c4, formData.nota_c5];
    for (const nota of notas) {
      if (nota && (parseInt(nota) < 0 || parseInt(nota) > 200 || parseInt(nota) % 40 !== 0)) {
        toast({
          title: "Notas inválidas",
          description: "As notas devem ser múltiplos de 40 entre 0 e 200.",
          variant: "destructive",
        });
        return;
      }
    }

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

  const calcularNotaTotal = () => {
    const notas = [
      parseInt(formData.nota_c1) || 0,
      parseInt(formData.nota_c2) || 0,
      parseInt(formData.nota_c3) || 0,
      parseInt(formData.nota_c4) || 0,
      parseInt(formData.nota_c5) || 0,
    ];
    const total = notas.reduce((sum, nota) => sum + nota, 0);
    setFormData(prev => ({ ...prev, nota_total: total.toString() }));
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

                      {redacao.corrigida && redacao.nota_total && (
                        <div className="flex items-center gap-2">
                          <Award className="w-4 h-4 text-redator-accent" />
                          <span className="text-sm text-redator-accent">Nota Total: {redacao.nota_total}/1000</span>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>{redacao.frase_tematica}</DialogTitle>
                          </DialogHeader>
                          <div className="bg-gray-50 p-4 rounded-lg border border-redator-accent/20">
                            <p className="whitespace-pre-wrap text-sm leading-relaxed">
                              {redacao.redacao_texto}
                            </p>
                          </div>
                        </DialogContent>
                      </Dialog>

                      <Button 
                        onClick={() => handleEdit(redacao)}
                        variant={redacao.corrigida ? "outline" : "default"}
                        size="sm"
                        className={!redacao.corrigida ? "bg-redator-primary hover:bg-redator-primary/90" : ""}
                      >
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
            <p className="text-redator-accent">Nenhuma redação encontrada.</p>
          </div>
        )}
      </div>

      {/* Formulário de correção */}
      {selectedRedacao && (
        <Card className="border-redator-primary/30">
          <CardHeader>
            <CardTitle className="text-redator-primary">
              Corrigir: {selectedRedacao.frase_tematica}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Notas por competência */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                {[
                  { key: 'nota_c1', label: 'Competência 1' },
                  { key: 'nota_c2', label: 'Competência 2' },
                  { key: 'nota_c3', label: 'Competência 3' },
                  { key: 'nota_c4', label: 'Competência 4' },
                  { key: 'nota_c5', label: 'Competência 5' },
                ].map((comp) => (
                  <div key={comp.key}>
                    <label className="block text-sm font-medium text-redator-primary mb-1">
                      {comp.label}
                    </label>
                    <Input
                      type="number"
                      min="0"
                      max="200"
                      step="40"
                      placeholder="0-200"
                      value={formData[comp.key as keyof typeof formData]}
                      onChange={(e) => setFormData(prev => ({ ...prev, [comp.key]: e.target.value }))}
                      className="border-redator-accent/30 focus:border-redator-accent"
                    />
                  </div>
                ))}
              </div>

              {/* Nota total */}
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-redator-primary mb-1">
                    Nota Total
                  </label>
                  <Input
                    type="number"
                    min="0"
                    max="1000"
                    placeholder="0-1000"
                    value={formData.nota_total}
                    onChange={(e) => setFormData(prev => ({ ...prev, nota_total: e.target.value }))}
                    className="border-redator-accent/30 focus:border-redator-accent"
                  />
                </div>
                <div className="flex items-end">
                  <Button 
                    type="button" 
                    onClick={calcularNotaTotal}
                    variant="outline"
                    className="border-redator-accent/50"
                  >
                    Calcular Total
                  </Button>
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
                  {corrigirMutation.isPending ? "Salvando..." : "Salvar Correção"}
                </Button>
                
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => setSelectedRedacao(null)}
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
