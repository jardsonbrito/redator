import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Eye, MessageCircle, Star, RotateCcw } from 'lucide-react';
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

  const getStatusBadge = (status: string) => {
    const statusMap = {
      draft: { label: 'Rascunho', variant: 'outline' as const },
      submitted: { label: 'Enviada', variant: 'secondary' as const },
      returned: { label: 'Devolvida', variant: 'destructive' as const },
      graded: { label: 'Corrigida', variant: 'default' as const }
    };

    const statusInfo = statusMap[status as keyof typeof statusMap] || statusMap.draft;
    
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
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
      const { error } = await supabase
        .from('lousa_resposta')
        .update({
          status: 'graded',
          nota: data.nota,
          comentario_professor: data.comentario_professor,
          corrected_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', correctingResposta.id)
        .eq('email_aluno', correctingResposta.email_aluno);

      if (error) {
        console.error('Erro ao corrigir resposta:', error);
        throw error;
      }

      toast({
        title: 'Sucesso',
        description: 'Resposta corrigida com sucesso'
      });

      setCorrectingResposta(null);
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

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="border-b pb-4">
        <h3 className="text-lg font-semibold">{lousa.titulo}</h3>
        <p className="text-sm text-muted-foreground mt-1">{lousa.enunciado}</p>
        <div className="mt-2 text-sm text-muted-foreground">
          Total de respostas: {respostas.length}
        </div>
      </div>

      {respostas.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <div className="w-12 h-12 mx-auto mb-4 rounded-lg bg-primary/10 flex items-center justify-center">
              📝
            </div>
            <h3 className="text-lg font-semibold mb-2">Nenhuma resposta ainda</h3>
            <p className="text-muted-foreground">
              Os alunos ainda não enviaram respostas para esta lousa
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Aluno</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Nota</TableHead>
                <TableHead>Última Atualização</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {respostas.map((resposta) => (
                <TableRow key={resposta.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{resposta.nome_aluno}</div>
                      <div className="text-sm text-muted-foreground">
                        {resposta.email_aluno}
                        {resposta.turma && ` • Turma ${resposta.turma}`}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(resposta.status)}
                  </TableCell>
                  <TableCell>
                    {resposta.nota !== null ? (
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-yellow-500" />
                        {resposta.nota}/10
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {format(new Date(resposta.updated_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-1 justify-end">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => setViewingResposta(resposta)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-3xl">
                          <DialogHeader>
                            <DialogTitle>Resposta - {resposta.nome_aluno}</DialogTitle>
                          </DialogHeader>
                          {viewingResposta && (
                            <div className="space-y-4">
                              <div>
                                <h4 className="font-semibold mb-2">Enunciado:</h4>
                                <p className="text-sm bg-muted p-3 rounded">{lousa.enunciado}</p>
                              </div>
                              <div>
                                <h4 className="font-semibold mb-2">Resposta do Aluno:</h4>
                                <div className="bg-background border p-4 rounded min-h-[120px]">
                                  {viewingResposta.conteudo || (
                                    <span className="text-muted-foreground italic">
                                      Nenhuma resposta enviada ainda
                                    </span>
                                  )}
                                </div>
                              </div>
                              {viewingResposta.comentario_professor && (
                                <div>
                                  <h4 className="font-semibold mb-2">Comentário do Professor:</h4>
                                  <p className="text-sm bg-blue-50 p-3 rounded border-l-4 border-blue-400">
                                    {viewingResposta.comentario_professor}
                                  </p>
                                </div>
                              )}
                              <div className="flex justify-end pt-4">
                                <Button onClick={() => openCorrectionModal(viewingResposta)}>
                                  <MessageCircle className="w-4 h-4 mr-2" />
                                  Corrigir
                                </Button>
                              </div>
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>

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