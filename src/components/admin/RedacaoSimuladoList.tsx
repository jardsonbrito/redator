
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, Edit, CheckCircle, Calendar, User, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const RedacaoSimuladoList = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filtroTurma, setFiltroTurma] = useState<string>("todas");
  const [filtroStatus, setFiltroStatus] = useState<string>("todas");
  const [buscaNome, setBuscaNome] = useState("");
  const [redacaoSelecionada, setRedacaoSelecionada] = useState<any>(null);
  const [notas, setNotas] = useState({
    nota_c1: 0,
    nota_c2: 0,
    nota_c3: 0,
    nota_c4: 0,
    nota_c5: 0
  });
  const [comentarioPedagogico, setComentarioPedagogico] = useState("");

  const { data: redacoes, isLoading } = useQuery({
    queryKey: ['redacoes-simulado'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('redacoes_simulado')
        .select(`
          *,
          simulados!inner(titulo, frase_tematica)
        `)
        .order('data_envio', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  const corrigirRedacao = useMutation({
    mutationFn: async ({ id, dadosCorrecao }: { id: string, dadosCorrecao: any }) => {
      const notaTotal = Object.values(notas).reduce((acc: number, nota: any) => acc + parseInt(nota || 0), 0);
      
      const { data, error } = await supabase
        .from('redacoes_simulado')
        .update({
          ...dadosCorrecao,
          nota_total: notaTotal,
          corrigida: true,
          data_correcao: new Date().toISOString()
        })
        .eq('id', id)
        .select();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Redação corrigida com sucesso!",
        description: "A correção foi salva e está disponível para o aluno.",
      });
      queryClient.invalidateQueries({ queryKey: ['redacoes-simulado'] });
      setRedacaoSelecionada(null);
    },
    onError: (error) => {
      toast({
        title: "Erro ao corrigir redação",
        description: "Não foi possível salvar a correção.",
        variant: "destructive",
      });
      console.error("Erro ao corrigir redação:", error);
    }
  });

  const handleCorrigir = () => {
    if (!redacaoSelecionada) return;
    
    corrigirRedacao.mutate({
      id: redacaoSelecionada.id,
      dadosCorrecao: {
        ...notas,
        comentario_pedagogico: comentarioPedagogico
      }
    });
  };

  const abrirCorrecao = (redacao: any) => {
    setRedacaoSelecionada(redacao);
    setNotas({
      nota_c1: redacao.nota_c1 || 0,
      nota_c2: redacao.nota_c2 || 0,
      nota_c3: redacao.nota_c3 || 0,
      nota_c4: redacao.nota_c4 || 0,
      nota_c5: redacao.nota_c5 || 0
    });
    setComentarioPedagogico(redacao.comentario_pedagogico || "");
  };

  // Filtrar redações
  const redacoesFiltradas = redacoes?.filter(redacao => {
    const matchTurma = filtroTurma === "todas" || redacao.turma === filtroTurma;
    const matchStatus = filtroStatus === "todas" || 
      (filtroStatus === "corrigidas" && redacao.corrigida) ||
      (filtroStatus === "pendentes" && !redacao.corrigida);
    const matchNome = buscaNome === "" || 
      redacao.nome_aluno.toLowerCase().includes(buscaNome.toLowerCase()) ||
      redacao.email_aluno.toLowerCase().includes(buscaNome.toLowerCase());
    
    return matchTurma && matchStatus && matchNome;
  });

  const turmasDisponiveis = ["LRA2025", "LRB2025", "LRC2025", "LRD2025", "LRE2025", "visitante"];

  if (isLoading) {
    return <div className="text-center py-8">Carregando redações...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-redator-primary">Redações de Simulados</h2>
        <Badge variant="outline" className="text-sm">
          {redacoesFiltradas?.length || 0} redação(ões) encontrada(s)
        </Badge>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label>Buscar por nome/email</Label>
              <Input
                placeholder="Digite nome ou email..."
                value={buscaNome}
                onChange={(e) => setBuscaNome(e.target.value)}
              />
            </div>
            
            <div>
              <Label>Turma</Label>
              <Select value={filtroTurma} onValueChange={setFiltroTurma}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas as turmas</SelectItem>
                  {turmasDisponiveis.map(turma => (
                    <SelectItem key={turma} value={turma}>
                      {turma === "visitante" ? "Visitantes" : turma}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Status</Label>
              <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  <SelectItem value="pendentes">Pendentes</SelectItem>
                  <SelectItem value="corrigidas">Corrigidas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de redações */}
      <div className="grid gap-4">
        {!redacoesFiltradas || redacoesFiltradas.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-gray-500">Nenhuma redação encontrada com os filtros aplicados.</p>
            </CardContent>
          </Card>
        ) : (
          redacoesFiltradas.map((redacao) => (
            <Card key={redacao.id} className="border-l-4 border-l-redator-primary">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{redacao.simulados.titulo}</CardTitle>
                    <p className="text-sm text-gray-600 mb-2">{redacao.simulados.frase_tematica}</p>
                    
                    <div className="flex flex-wrap gap-2 mb-2">
                      <Badge className={redacao.corrigida ? "bg-green-500" : "bg-yellow-500"}>
                        {redacao.corrigida ? "Corrigida" : "Pendente"}
                      </Badge>
                      <Badge variant="outline">{redacao.turma === "visitante" ? "Visitante" : redacao.turma}</Badge>
                      {redacao.corrigida && (
                        <Badge variant="secondary">Nota: {redacao.nota_total}</Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <User className="w-4 h-4" />
                        {redacao.nome_aluno}
                      </div>
                      <div className="flex items-center gap-1">
                        <Mail className="w-4 h-4" />
                        {redacao.email_aluno}
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {format(new Date(redacao.data_envio), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Eye className="w-4 h-4 mr-1" />
                          Ver
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Redação - {redacao.nome_aluno}</DialogTitle>
                        </DialogHeader>
                        <div className="mt-4">
                          <div className="bg-gray-50 p-4 rounded mb-4">
                            <h3 className="font-bold text-redator-primary mb-2">{redacao.simulados.frase_tematica}</h3>
                          </div>
                          <div className="bg-white p-4 border rounded whitespace-pre-wrap">
                            {redacao.texto}
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                    
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          variant="default" 
                          size="sm"
                          onClick={() => abrirCorrecao(redacao)}
                          className="bg-redator-primary"
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          {redacao.corrigida ? "Editar" : "Corrigir"}
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Correção - {redacao.nome_aluno}</DialogTitle>
                        </DialogHeader>
                        
                        {redacaoSelecionada && (
                          <Tabs defaultValue="redacao" className="mt-4">
                            <TabsList>
                              <TabsTrigger value="redacao">Redação</TabsTrigger>
                              <TabsTrigger value="correcao">Correção</TabsTrigger>
                            </TabsList>
                            
                            <TabsContent value="redacao">
                              <div className="bg-gray-50 p-4 rounded mb-4">
                                <h3 className="font-bold text-redator-primary">{redacao.simulados.frase_tematica}</h3>
                              </div>
                              <div className="bg-white p-4 border rounded whitespace-pre-wrap max-h-96 overflow-y-auto">
                                {redacao.texto}
                              </div>
                            </TabsContent>
                            
                            <TabsContent value="correcao" className="space-y-4">
                              <div className="grid grid-cols-5 gap-4">
                                {[1, 2, 3, 4, 5].map(num => (
                                  <div key={num}>
                                    <Label>Competência {num}</Label>
                                     <select
                                       className="w-full p-2 border border-gray-300 rounded-md"
                                       value={notas[`nota_c${num}` as keyof typeof notas]}
                                       onChange={(e) => setNotas({
                                         ...notas,
                                         [`nota_c${num}`]: parseInt(e.target.value) || 0
                                       })}
                                     >
                                       {[0, 40, 80, 120, 160, 200].map(valor => (
                                         <option key={valor} value={valor}>{valor}</option>
                                       ))}
                                     </select>
                                  </div>
                                ))}
                              </div>
                              
                              <div>
                                <Label>Comentário Pedagógico</Label>
                                <Textarea
                                  value={comentarioPedagogico}
                                  onChange={(e) => setComentarioPedagogico(e.target.value)}
                                  placeholder="Digite sua correção pedagógica detalhada..."
                                  className="min-h-[200px]"
                                />
                              </div>
                              
                               <div className="flex justify-between items-center">
                                <div className="text-lg font-bold">
                                  Nota Total: {Object.values(notas).reduce((acc: number, nota: any) => acc + parseInt(nota || 0), 0)}
                                </div>
                                <Button 
                                  onClick={handleCorrigir}
                                  disabled={corrigirRedacao.isPending}
                                  className="bg-redator-primary hover:bg-redator-primary/90"
                                >
                                  <CheckCircle className="w-4 h-4 mr-2" />
                                  {corrigirRedacao.isPending ? "Salvando..." : "Salvar Correção"}
                                </Button>
                              </div>
                            </TabsContent>
                          </Tabs>
                        )}
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default RedacaoSimuladoList;
