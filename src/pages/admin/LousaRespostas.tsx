import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowLeft, Clock, Users, MessageSquare, Edit, Trash2, Star, Eye, ChevronDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
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
      return <Badge variant="outline" className="bg-gray-100 text-gray-700 border-gray-300">Rascunho</Badge>;
    }

    if (!lousa.ativo) {
      return <Badge variant="destructive">Inativa</Badge>;
    }

    if (inicio && now < inicio) {
      return <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-blue-300">Programada</Badge>;
    }

    if (fim && now > fim) {
      return <Badge variant="destructive">Encerrada</Badge>;
    }

    return <Badge className="bg-green-100 text-green-700 border-green-300">Publicada</Badge>;
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
    navigate('/admin?view=lousa');
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center p-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!lousa) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
        <div className="container mx-auto px-4 py-8">
          <Card className="max-w-2xl mx-auto shadow-lg">
            <CardContent className="py-12 text-center">
              <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-destructive/10 flex items-center justify-center">
                <MessageSquare className="w-8 h-8 text-destructive" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-foreground">Lousa não encontrada</h3>
              <p className="text-muted-foreground mb-6">
                A lousa solicitada não foi encontrada ou você não tem permissão para acessá-la.
              </p>
              <Button 
                  onClick={() => navigate('/admin?view=lousa')}
                className="bg-primary hover:bg-primary/90"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar para Minhas Lousas
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <div className="container mx-auto px-4 py-6 space-y-8">
        {/* Breadcrumb - mais discreto */}
        <div className="flex items-center justify-between">
          <Breadcrumb className="text-sm">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink 
                  className="cursor-pointer hover:text-primary transition-colors text-muted-foreground"
                  onClick={() => navigate('/admin')}
                >
                  Dashboard
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink 
                  className="cursor-pointer hover:text-primary transition-colors text-muted-foreground"
                  onClick={() => navigate('/admin?view=lousa')}
                >
                  Lousa
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbPage className="text-foreground font-medium">Respostas</BreadcrumbPage>
            </BreadcrumbList>
          </Breadcrumb>

          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate('/admin?view=lousa')}
            className="bg-white/50 hover:bg-white/80 border-white/20 backdrop-blur-sm"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
        </div>

        {/* Header Banner com Capa */}
        <div className="relative overflow-hidden rounded-2xl shadow-xl">
          {/* Background Image or Gradient */}
          {lousa.capa_url ? (
            <div 
              className="h-64 bg-cover bg-center"
              style={{ backgroundImage: `url(${lousa.capa_url})` }}
            />
          ) : (
            <div className="h-64 bg-gradient-to-br from-primary via-primary/80 to-primary/60 relative">
              <div className="absolute top-8 right-8 text-6xl opacity-20">📝</div>
            </div>
          )}
        </div>

        {/* Resumo da Atividade */}
        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-muted-foreground text-sm font-medium">
                <MessageSquare className="w-4 h-4" />
                Respostas
              </div>
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl font-bold text-gray-900">
                  {lousa.titulo}
                </CardTitle>
                {getStatusBadge(lousa)}
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-gray-600">
                  <Clock className="w-5 h-5 text-primary" />
                  <span className="font-medium">Período:</span>
                  <span>{getPeriodText(lousa)}</span>
                </div>
                
                <div className="flex items-center gap-3 text-gray-600">
                  <Users className="w-5 h-5 text-primary" />
                  <span className="font-medium">Turmas:</span>
                  <div className="flex items-center gap-2 flex-wrap">
                    {lousa.turmas.length > 0 ? (
                      lousa.turmas.map((turma, index) => (
                        <Badge key={index} variant="outline" className="bg-primary/10 text-primary">
                          {turma}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-muted-foreground">Nenhuma turma</span>
                    )}
                    {lousa.permite_visitante && (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        Visitantes
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Enunciado da Atividade - Collapsible */}
        <Card className="shadow-lg border-0">
          <Collapsible defaultOpen>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-gray-50/50 transition-colors">
                <CardTitle className="text-xl font-bold text-gray-900 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <MessageSquare className="w-5 h-5 text-primary" />
                    Enunciado da Atividade
                  </div>
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            
            <CollapsibleContent>
              <CardContent className="pt-0">
                <div className="bg-gray-50/50 rounded-xl p-6 border border-gray-100">
                  <p className="text-gray-700 leading-relaxed text-lg whitespace-pre-line">
                    {lousa.enunciado}
                  </p>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>

        {/* Lista de Respostas */}
        <Card className="shadow-lg border-0">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <Star className="w-6 h-6 text-amber-500" />
              Respostas dos Alunos
            </CardTitle>
          </CardHeader>
          
          <CardContent className="p-0">
            <LousaRespostas lousa={lousa} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}