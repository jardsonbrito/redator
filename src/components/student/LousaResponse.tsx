import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowLeft, Save, Send, Clock, User, AlertCircle, CheckCircle, Star } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useStudentAuth } from '@/hooks/useStudentAuth';

interface Lousa {
  id: string;
  titulo: string;
  enunciado: string;
  inicio_em: string | null;
  fim_em: string | null;
  ativo: boolean;
  status: string;
}

interface LousaResposta {
  id: string;
  conteudo: string;
  status: string;
  nota: number | null;
  comentario_professor: string | null;
  submitted_at: string | null;
  corrected_at: string | null;
}

export default function LousaResponse() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { studentData: student } = useStudentAuth();
  const { toast } = useToast();

  const [lousa, setLousa] = useState<Lousa | null>(null);
  const [resposta, setResposta] = useState<LousaResposta | null>(null);
  const [conteudo, setConteudo] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    if (!id || !student) return;

    try {
      // Buscar lousa
      const { data: lousaData, error: lousaError } = await supabase
        .from('lousa')
        .select('*')
        .eq('id', id)
        .single();

      if (lousaError) throw lousaError;
      setLousa(lousaData);

      // Buscar resposta existente
      const { data: respostaData, error: respostaError } = await supabase
        .from('lousa_resposta')
        .select('*')
        .eq('lousa_id', id)
        .eq('email_aluno', student.email)
        .maybeSingle();

      if (respostaError && respostaError.code !== 'PGRST116') {
        throw respostaError;
      }

      if (respostaData) {
        setResposta(respostaData);
        setConteudo(respostaData.conteudo);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar lousa',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id, student]);

  // Autosave a cada 10 segundos
  const autoSave = useCallback(async () => {
    if (!lousa || !student || saving || !conteudo.trim()) return;
    if (resposta && resposta.status === 'submitted') return; // Não salvar se já enviado

    try {
      const respostaData = {
        lousa_id: lousa.id,
        aluno_id: student.id || null,
        email_aluno: student.email || '',
        nome_aluno: student.nomeUsuario || '',
        turma: student.turma || '',
        conteudo: conteudo.trim(),
        status: 'draft'
      };

      if (resposta) {
        const { error } = await supabase
          .from('lousa_resposta')
          .update(respostaData)
          .eq('id', resposta.id);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('lousa_resposta')
          .insert([respostaData])
          .select()
          .single();

        if (error) throw error;
        setResposta(data);
      }
    } catch (error) {
      console.error('Erro no autosave:', error);
    }
  }, [lousa, student, conteudo, resposta, saving]);

  useEffect(() => {
    const interval = setInterval(autoSave, 10000);
    return () => clearInterval(interval);
  }, [autoSave]);

  const handleSave = async () => {
    if (!lousa || !student || !conteudo.trim()) return;

    setSaving(true);
    try {
      const respostaData = {
        lousa_id: lousa.id,
        aluno_id: student.id || null,
        email_aluno: student.email || '',
        nome_aluno: student.nomeUsuario || '',
        turma: student.turma || '',
        conteudo: conteudo.trim(),
        status: 'draft'
      };

      if (resposta) {
        const { error } = await supabase
          .from('lousa_resposta')
          .update(respostaData)
          .eq('id', resposta.id);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('lousa_resposta')
          .insert([respostaData])
          .select()
          .single();

        if (error) throw error;
        setResposta(data);
      }

      toast({
        title: 'Sucesso',
        description: 'Rascunho salvo com sucesso'
      });
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao salvar rascunho',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!conteudo.trim()) return;

    setSubmitting(true);
    try {
      // Se não há resposta, crie uma primeiro
      if (!resposta) {
        await handleSave();
        // Aguarde um momento para garantir que a resposta foi criada
        await fetchData();
        return;
      }

      const { error } = await supabase
        .from('lousa_resposta')
        .update({
          conteudo: conteudo.trim(),
          status: 'submitted',
          submitted_at: new Date().toISOString()
        })
        .eq('id', resposta.id);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Resposta enviada com sucesso!'
      });

      fetchData(); // Recarregar dados
    } catch (error) {
      console.error('Erro ao enviar:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao enviar resposta',
        variant: 'destructive'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = () => {
    if (!resposta) return null;

    const statusMap = {
      draft: { label: 'Rascunho', variant: 'outline' as const, icon: AlertCircle },
      submitted: { label: 'Enviada', variant: 'secondary' as const, icon: CheckCircle },
      returned: { label: 'Devolvida', variant: 'destructive' as const, icon: AlertCircle },
      graded: { label: 'Corrigida', variant: 'default' as const, icon: Star }
    };

    const statusInfo = statusMap[resposta.status as keyof typeof statusMap];
    if (!statusInfo) return null;

    const Icon = statusInfo.icon;

    return (
      <Badge variant={statusInfo.variant} className="mb-4">
        <Icon className="w-3 h-3 mr-1" />
        {statusInfo.label}
      </Badge>
    );
  };

  const isDisabled = () => {
    if (!lousa) return true;
    if (!lousa.ativo || lousa.status !== 'active') return true;
    if (resposta && ['submitted', 'graded'].includes(resposta.status)) return true;
    
    const now = new Date();
    if (lousa.inicio_em && now < new Date(lousa.inicio_em)) return true;
    if (lousa.fim_em && now > new Date(lousa.fim_em)) return true;
    
    return false;
  };

  const canEdit = resposta && resposta.status === 'returned';

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!lousa) {
    return (
      <div className="container mx-auto p-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Lousa não encontrada.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
        {getStatusBadge()}
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              📝
            </div>
            {lousa.titulo}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Enunciado:</h4>
              <p className="text-sm bg-muted p-4 rounded-lg">{lousa.enunciado}</p>
            </div>

            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <User className="w-4 h-4" />
                {student?.nomeUsuario}
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Feedback do Professor */}
      {resposta?.comentario_professor && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Feedback do Professor</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {resposta.status === 'graded' && resposta.nota !== null && (
                <div className="flex items-center gap-2 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <Star className="w-5 h-5 text-yellow-600" />
                  <span className="font-medium text-yellow-800">
                    Nota: {resposta.nota}/10
                  </span>
                </div>
              )}
              
              <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-400">
                <p className="text-blue-800">{resposta.comentario_professor}</p>
              </div>

              {resposta.corrected_at && (
                <p className="text-xs text-muted-foreground">
                  Corrigido em {format(new Date(resposta.corrected_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Área de Resposta */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Sua Resposta</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Textarea
              placeholder="Digite sua resposta aqui..."
              value={conteudo}
              onChange={(e) => setConteudo(e.target.value)}
              onBlur={autoSave}
              disabled={isDisabled() && !canEdit}
              className="min-h-[200px] resize-none"
            />

            {resposta?.submitted_at && (
              <p className="text-xs text-muted-foreground">
                Enviado em {format(new Date(resposta.submitted_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
              </p>
            )}

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleSave}
                disabled={saving || !conteudo.trim() || (resposta && resposta.status === 'submitted')}
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Salvando...' : 'Salvar Rascunho'}
              </Button>

              {(!resposta || resposta.status !== 'submitted') && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      disabled={!conteudo.trim() || submitting || (resposta && resposta.status === 'submitted')}
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Enviar Resposta
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Confirmar Envio</AlertDialogTitle>
                      <AlertDialogDescription>
                        Tem certeza que deseja enviar sua resposta? 
                        Após o envio, você não poderá mais editá-la (exceto se o professor devolvê-la).
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={handleSubmit}>
                        Enviar Resposta
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>

            {isDisabled() && !canEdit && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {!lousa.ativo || lousa.status !== 'active' 
                    ? 'Esta lousa não está mais disponível.' 
                    : resposta?.status === 'submitted'
                    ? 'Resposta já enviada. Aguarde a correção do professor.'
                    : resposta?.status === 'graded'
                    ? 'Resposta já foi corrigida.'
                    : 'Esta lousa ainda não está disponível ou já foi encerrada.'
                  }
                </AlertDescription>
              </Alert>
            )}

            {canEdit && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Sua resposta foi devolvida pelo professor. Você pode fazer correções e reenviar.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}