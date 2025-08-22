import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowLeft, Clock, Users, MessageSquare } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import LousaRespostas from '@/components/admin/LousaRespostas';

interface Lousa {
  id: string;
  titulo: string;
  enunciado: string;
  status: string;
  inicio_em: string | null;
  fim_em: string | null;
  turmas: string[];
  permite_visitante: boolean;
  ativo: boolean;
  created_at: string;
  capa_url: string | null;
}

export default function LousaRespostasPage() {
  const { lousaId } = useParams<{ lousaId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: lousa, isLoading, error } = useQuery({
    queryKey: ['lousa', lousaId],
    queryFn: async () => {
      if (!lousaId) throw new Error('ID da lousa não fornecido');
      
      const { data, error } = await supabase
        .from('lousa')
        .select('*')
        .eq('id', lousaId)
        .single();

      if (error) throw error;
      return data as Lousa;
    },
    enabled: !!lousaId
  });

  const getStatusBadge = (lousa: Lousa) => {
    const now = new Date();
    const inicio = lousa.inicio_em ? new Date(lousa.inicio_em) : null;
    const fim = lousa.fim_em ? new Date(lousa.fim_em) : null;

    if (lousa.status === 'draft') {
      return <Badge variant="outline">Rascunho</Badge>;
    }

    if (!lousa.ativo) {
      return <Badge variant="destructive">Inativa</Badge>;
    }

    if (inicio && now < inicio) {
      return <Badge variant="secondary">Programada</Badge>;
    }

    if (fim && now > fim) {
      return <Badge variant="destructive">Encerrada</Badge>;
    }

    return <Badge variant="default">Publicada</Badge>;
  };

  const getPeriodText = (lousa: Lousa) => {
    if (!lousa.inicio_em && !lousa.fim_em) {
      return 'Disponível agora';
    }

    const formatDate = (date: string) => 
      format(new Date(date), 'dd/MM/yyyy HH:mm', { locale: ptBR });

    if (lousa.inicio_em && lousa.fim_em) {
      return `${formatDate(lousa.inicio_em)} - ${formatDate(lousa.fim_em)}`;
    }

    if (lousa.inicio_em) {
      return `A partir de ${formatDate(lousa.inicio_em)}`;
    }

    if (lousa.fim_em) {
      return `Até ${formatDate(lousa.fim_em)}`;
    }

    return 'Disponível agora';
  };

  if (error) {
    toast({
      title: 'Erro',
      description: 'Erro ao carregar dados da lousa',
      variant: 'destructive'
    });
    navigate('/admin/lousa');
    return null;
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (!lousa) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="py-12 text-center">
            <h3 className="text-lg font-semibold mb-2">Lousa não encontrada</h3>
            <p className="text-muted-foreground mb-4">
              A lousa solicitada não foi encontrada ou você não tem permissão para acessá-la.
            </p>
            <Button onClick={() => navigate('/admin/lousa')}>
              Voltar para Minhas Lousas
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink 
              className="cursor-pointer hover:text-primary"
              onClick={() => navigate('/admin')}
            >
              Dashboard
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink 
              className="cursor-pointer hover:text-primary"
              onClick={() => navigate('/admin/lousa')}
            >
              Lousa
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbPage>Respostas - {lousa.titulo}</BreadcrumbPage>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex items-center gap-4">
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => navigate('/admin/lousa')}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">Respostas - {lousa.titulo}</h1>
        </div>
      </div>

      {/* Lousa Info Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CardTitle className="text-xl">{lousa.titulo}</CardTitle>
                {getStatusBadge(lousa)}
              </div>
              
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {getPeriodText(lousa)}
                </div>
                
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  {lousa.turmas.length > 0 ? lousa.turmas.join(', ') : 'Nenhuma'}
                  {lousa.permite_visitante && (
                    <Badge variant="outline" className="ml-1">Visitantes</Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Enunciado da Atividade
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {lousa.enunciado}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Responses Component */}
      <LousaRespostas lousa={lousa} />
    </div>
  );
}