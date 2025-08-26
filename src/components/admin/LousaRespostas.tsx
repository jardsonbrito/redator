import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MessageCircle, Star, RotateCcw, User, Clock, Copy } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Lousa {
  id: string;
  titulo: string;
  enunciado: string;
}

interface LousaResposta {
  id: string;
  nome_aluno: string;
  email_aluno: string;
  turma: string | null;
  conteudo: string;
  status: string;
  nota: number | null;
  comentario_professor: string | null;
  submitted_at: string | null;
  corrected_at: string | null;
  updated_at: string;
}

interface LousaRespostasProps {
  lousa: Lousa;
}

const correcaoSchema = z.object({
  comentario_professor: z.string().min(1, 'Comentário é obrigatório'),
  nota: z.number().min(0, 'Nota deve ser entre 0 e 10').max(10, 'Nota deve ser entre 0 e 10')
});

type CorrecaoFormData = z.infer<typeof correcaoSchema>;

export default function LousaRespostas({ lousa }: LousaRespostasProps) {
  const [respostas, setRespostas] = useState<LousaResposta[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingResposta, setViewingResposta] = useState<LousaResposta | null>(null);
  const [correctingResposta, setCorrectingResposta] = useState<LousaResposta | null>(null);
  const { toast } = useToast();

  const form = useForm<CorrecaoFormData>({
    resolver: zodResolver(correcaoSchema),
    defaultValues: {
      comentario_professor: '',
      nota: 0
    }
  });

  const fetchRespostas = async () => {
    try {
      const { data, error } = await supabase
        .from('lousa_resposta')
        .select('*')
        .eq('lousa_id', lousa.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setRespostas(data || []);
    } catch (error) {
      console.error('Erro ao carregar respostas:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar respostas',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRespostas();
  }, [lousa.id]);

  const getStatusBadge = (resposta: LousaResposta) => {
    // Enhanced status badges with better colors
    if (resposta.nota !== null) {
      return <Badge className="bg-green-100 text-green-800 border-green-200 font-medium">Corrigida</Badge>;
    }
    
    if (resposta.status === 'submitted' || resposta.conteudo) {
      return <Badge className="bg-purple-100 text-purple-800 border-purple-200 font-medium">Pendente</Badge>;
    }
    
    if (resposta.status === 'returned') {
      return <Badge className="bg-red-100 text-red-800 border-red-200 font-medium">Devolvida</Badge>;
    }
    
    return <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200">Sem envio</Badge>;
  };

  const handleDevolver = async (resposta: LousaResposta, comentario: string) => {
    try {
      const { error } = await supabase
        .from('lousa_resposta')
        .update({
          status: 'returned',
          comentario_professor: comentario,
          corrected_at: new Date().toISOString()
        })
        .eq('id', resposta.id);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Resposta devolvida para o aluno'
      });

      setCorrectingResposta(null);
      setViewingResposta(null);
      form.reset();
      fetchRespostas();
    } catch (error) {
      console.error('Erro ao devolver resposta:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao devolver resposta',
        variant: 'destructive'
      });
    }
  };

  const handleCorrigir = async (data: CorrecaoFormData) => {
    if (!correctingResposta) return;

    try {
      const { error } = await supabase.rpc('corrigir_lousa_resposta', {
        resposta_id: correctingResposta.id,
        p_comentario_professor: data.comentario_professor,
        p_nota: data.nota,
        corretor_email: 'jardsonbrito@gmail.com' // Email do admin logado
      });

      if (error) {
        console.error('Erro detalhado ao corrigir resposta:', error);
        throw error;
      }

      toast({
        title: 'Sucesso',
        description: 'Resposta corrigida com sucesso'
      });

      setCorrectingResposta(null);
      setViewingResposta(null);
      form.reset();
      fetchRespostas();
    } catch (error) {
      console.error('Erro ao corrigir resposta:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao corrigir resposta',
        variant: 'destructive'
      });
    }
  };

  const openCorrectionModal = (resposta: LousaResposta) => {
    setCorrectingResposta(resposta);
    form.reset({
      comentario_professor: resposta.comentario_professor || '',
      nota: resposta.nota || 0
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const totalRespostas = respostas.length;

  return (
    <div className="space-y-6">
      {/* Header com contador */}
      <div className="flex items-center justify-between bg-gradient-to-r from-primary/5 to-primary/10 p-6 rounded-xl border border-primary/10">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Respostas Recebidas</h3>
          <p className="text-gray-600">Total de {totalRespostas} {totalRespostas === 1 ? 'resposta' : 'respostas'}</p>
        </div>
        <div className="text-2xl font-bold text-primary">{totalRespostas}</div>
      </div>

      {respostas.length === 0 ? (
        <Card className="shadow-lg border-0">
          <CardContent className="py-12 text-center">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-gray-100 flex items-center justify-center">
              <MessageCircle className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold mb-3 text-gray-900">Nenhuma resposta ainda</h3>
            <p className="text-gray-600 max-w-md mx-auto">
              Os alunos ainda não enviaram respostas para esta lousa. Elas aparecerão aqui quando forem enviadas.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block">
            <Card className="shadow-lg border-0 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/80 hover:bg-gray-50/80">
                    <TableHead className="font-semibold text-gray-900">Aluno</TableHead>
                    <TableHead className="font-semibold text-gray-900">Status</TableHead>
                    <TableHead className="font-semibold text-gray-900">Nota</TableHead>
                    <TableHead className="font-semibold text-gray-900">Última Atualização</TableHead>
                    <TableHead className="text-right font-semibold text-gray-900">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                  <TableBody>
                    {respostas.map((resposta, index) => (
                      <TableRow 
                        key={resposta.id} 
                        className={`border-b transition-colors hover:bg-gray-50/50 ${
                          index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                        }`}
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <User className="w-4 h-4 text-primary" />
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">{resposta.nome_aluno}</div>
                              {resposta.turma && (
                                <div className="text-sm text-gray-500">{resposta.turma}</div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(resposta)}
                        </TableCell>
                        <TableCell>
                          {resposta.nota !== null ? (
                            <div className="flex items-center gap-2">
                              <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                              <span className="font-bold text-amber-700 text-lg">{resposta.nota}/10</span>
                            </div>
                          ) : (
                            <span className="text-gray-400 font-medium">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-gray-600">
                            <Clock className="w-4 h-4" />
                            {format(new Date(resposta.updated_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => openCorrectionModal(resposta)}
                            >
                              <MessageCircle className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                </TableRow>
              ))}
            </TableBody>
              </Table>
            </Card>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-4">
            {respostas.map((resposta, index) => (
              <Card key={resposta.id} className="shadow-md border-0 bg-white">
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">{resposta.nome_aluno}</div>
                        {resposta.turma && (
                          <div className="text-sm text-gray-500">{resposta.turma}</div>
                        )}
                      </div>
                    </div>
                    {getStatusBadge(resposta)}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-gray-500 mb-1">Nota</div>
                      {resposta.nota !== null ? (
                        <div className="flex items-center gap-2">
                          <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                          <span className="font-bold text-amber-700">{resposta.nota}/10</span>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </div>
                    <div>
                      <div className="text-sm text-gray-500 mb-1">Atualização</div>
                      <div className="text-sm text-gray-600">
                        {format(new Date(resposta.updated_at), 'dd/MM/yyyy', { locale: ptBR })}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="flex-1"
                      onClick={() => openCorrectionModal(resposta)}
                    >
                      <MessageCircle className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Modal de Correção */}
      <Dialog open={!!correctingResposta} onOpenChange={() => setCorrectingResposta(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Corrigir Resposta - {correctingResposta?.nome_aluno}
            </DialogTitle>
          </DialogHeader>
          
          {correctingResposta && (
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Resposta do Aluno:</h4>
                <div className="bg-background border p-4 rounded min-h-[100px]">
                  {correctingResposta.conteudo || (
                    <span className="text-muted-foreground italic">
                      Nenhuma resposta enviada ainda
                    </span>
                  )}
                </div>
              </div>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleCorrigir)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="comentario_professor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Comentário do Professor *</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Digite seu feedback para o aluno..."
                            className="min-h-[100px]"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="nota"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nota (0-10)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="0" 
                            max="10" 
                            step="0.1"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex gap-3 pt-4">
                    <Button 
                      type="button"
                      variant="outline"
                      onClick={() => {
                        const comentario = form.getValues('comentario_professor');
                        if (comentario.trim()) {
                          handleDevolver(correctingResposta, comentario);
                        } else {
                          toast({
                            title: 'Erro',
                            description: 'Comentário é obrigatório para devolver',
                            variant: 'destructive'
                          });
                        }
                      }}
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Devolver
                    </Button>
                    
                    <Button type="submit">
                      <Star className="w-4 h-4 mr-2" />
                      Concluir Correção
                    </Button>

                    <Button 
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const textToCopy = `${correctingResposta.nome_aluno}\n\n${correctingResposta.conteudo || 'Nenhuma resposta enviada'}`;
                        navigator.clipboard.writeText(textToCopy);
                        toast({
                          title: 'Copiado!',
                          description: 'Nome e resposta do aluno copiados para a área de transferência'
                        });
                      }}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}