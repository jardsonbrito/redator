
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { FileText, Calendar, Eye, Clock, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { RedacaoEnviadaCard } from "./RedacaoEnviadaCard";
import { Link } from "react-router-dom";

type RedacaoTurma = {
  id: string;
  frase_tematica: string;
  nome_aluno: string;
  email_aluno: string;
  tipo_envio: string;
  data_envio: string;
  status: string;
  corrigida: boolean;
  nota_total: number | null;
  comentario_admin: string | null;
  data_correcao: string | null;
  redacao_texto?: string;
  nota_c1?: number | null;
  nota_c2?: number | null;
  nota_c3?: number | null;
  nota_c4?: number | null;
  nota_c5?: number | null;
  corretor_nome?: string;
};

export const MinhasRedacoes = () => {
  const [authenticatedRedacao, setAuthenticatedRedacao] = useState<RedacaoTurma & { redacao_texto: string } | null>(null);
  const [showRedacaoDialog, setShowRedacaoDialog] = useState(false);
  const { toast } = useToast();

  // Determinar email do usuário logado
  let currentUserEmail = "";
  const userType = localStorage.getItem("userType");
  const alunoTurma = localStorage.getItem("alunoTurma");
  const visitanteData = localStorage.getItem("visitanteData");
  
  if (userType === "aluno" && alunoTurma) {
    const turmasMap = {
      "Turma A": "LRA2025",
      "Turma B": "LRB2025", 
      "Turma C": "LRC2025",
      "Turma D": "LRD2025",
      "Turma E": "LRE2025"
    };
    const codigoTurma = turmasMap[alunoTurma as keyof typeof turmasMap] || "";
    currentUserEmail = `aluno.${codigoTurma.toLowerCase()}@laboratoriodoredator.com`;
  } else if (userType === "visitante" && visitanteData) {
    try {
      const dados = JSON.parse(visitanteData);
      currentUserEmail = dados.email;
    } catch (error) {
      console.error('❌ Erro ao parsear dados do visitante:', error);
    }
  }

  const { data: redacoesTurma, isLoading, error } = useQuery({
    queryKey: ['redacoes-minhas', currentUserEmail],
    queryFn: async () => {
      if (!currentUserEmail) {
        console.log('❌ Nenhum e-mail de usuário identificado');
        return [];
      }

      console.log('🔍 Carregando redações do usuário:', currentUserEmail);

      // Buscar redações regulares do usuário logado usando ilike para busca case-insensitive
      const { data: redacoesRegulares, error: errorRegulares } = await supabase
        .from('redacoes_enviadas')
        .select(`
          id,
          frase_tematica,
          nome_aluno,
          email_aluno,
          tipo_envio,
          data_envio,
          status,
          corrigida,
          nota_total,
          comentario_admin,
          data_correcao
        `)
        .ilike('email_aluno', currentUserEmail)
        .order('data_envio', { ascending: false });

      if (errorRegulares) {
        console.error('❌ Erro ao buscar redações regulares:', errorRegulares);
        throw errorRegulares;
      }

      // Buscar redações de simulado do usuário logado
      const { data: redacoesSimulado, error: errorSimulado } = await supabase
        .from('redacoes_simulado')
        .select(`
          id,
          nome_aluno,
          email_aluno,
          data_envio,
          corrigida,
          nota_total,
          data_correcao,
          simulados!inner(titulo)
        `)
        .ilike('email_aluno', currentUserEmail)
        .order('data_envio', { ascending: false });

      if (errorSimulado) {
        console.error('❌ Erro ao buscar redações de simulado:', errorSimulado);
      }

      // Combinar e formatar dados
      const todasRedacoes: RedacaoTurma[] = [];
      
      if (redacoesRegulares) {
        const regularesFormatadas = redacoesRegulares.map(redacao => ({
          ...redacao,
          corretor_nome: 'Corretor Principal'
        }));
        todasRedacoes.push(...regularesFormatadas);
      }

      if (redacoesSimulado) {
        const simuladosFormatados = redacoesSimulado.map(simulado => ({
          id: simulado.id,
          frase_tematica: (simulado.simulados as any)?.titulo || 'Simulado',
          nome_aluno: simulado.nome_aluno,
          email_aluno: simulado.email_aluno,
          tipo_envio: 'simulado',
          data_envio: simulado.data_envio,
          status: simulado.corrigida ? 'corrigida' : 'aguardando',
          corrigida: simulado.corrigida,
          nota_total: simulado.nota_total,
          comentario_admin: null,
          data_correcao: simulado.data_correcao,
          corretor_nome: 'Corretor Principal'
        }));
        todasRedacoes.push(...simuladosFormatados);
      }

      console.log('✅ Total de redações encontradas:', todasRedacoes.length);
      return todasRedacoes || [];
    },
    enabled: !!currentUserEmail,
  });

  const handleViewRedacao = async (redacao: RedacaoTurma) => {
    console.log('👁️ Visualizando redação:', redacao.id);
    
    try {
      let redacaoCompleta;
      
      if (redacao.tipo_envio === 'simulado') {
        const { data, error } = await supabase
          .from('redacoes_simulado')
          .select('*, simulados!inner(titulo)')
          .eq('id', redacao.id)
          .single();
          
        if (error) throw new Error('Erro ao carregar redação de simulado');
        
        redacaoCompleta = {
          ...data,
          redacao_texto: data.texto,
          frase_tematica: (data.simulados as any)?.titulo || 'Simulado'
        };
      } else {
        const { data, error } = await supabase
          .from('redacoes_enviadas')
          .select('*')
          .eq('id', redacao.id)
          .single();

        if (error) throw new Error('Erro ao carregar redação regular');
        
        redacaoCompleta = data;
      }

      const redacaoAutenticada: RedacaoTurma & { redacao_texto: string } = {
        id: redacaoCompleta.id,
        frase_tematica: redacaoCompleta.frase_tematica,
        nome_aluno: redacaoCompleta.nome_aluno,
        email_aluno: redacaoCompleta.email_aluno,
        tipo_envio: redacao.tipo_envio,
        data_envio: redacaoCompleta.data_envio,
        status: redacao.status,
        corrigida: redacaoCompleta.corrigida,
        nota_total: redacaoCompleta.nota_total,
        comentario_admin: redacaoCompleta.comentario_admin,
        data_correcao: redacaoCompleta.data_correcao,
        redacao_texto: redacaoCompleta.redacao_texto || redacaoCompleta.texto || "",
        nota_c1: redacaoCompleta.nota_c1,
        nota_c2: redacaoCompleta.nota_c2,
        nota_c3: redacaoCompleta.nota_c3,
        nota_c4: redacaoCompleta.nota_c4,
        nota_c5: redacaoCompleta.nota_c5,
        corretor_nome: redacao.corretor_nome
      };

      setAuthenticatedRedacao(redacaoAutenticada);
      setShowRedacaoDialog(true);
      
      toast({
        title: "Redação carregada!",
        description: "Visualizando sua redação completa.",
      });

    } catch (error) {
      console.error('💥 Erro ao carregar redação:', error);
      toast({
        title: "Erro ao carregar redação",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const resetState = () => {
    setAuthenticatedRedacao(null);
    setShowRedacaoDialog(false);
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

  if (!currentUserEmail) {
    return (
      <Card className="border-primary/20">
        <CardContent className="text-center py-8">
          <FileText className="w-12 h-12 text-primary mx-auto mb-4" />
          <p className="text-primary">
            Faça login como aluno ou visitante para visualizar suas redações.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-primary flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Minhas Redações
        </h2>
        <Link to="/minhas-redacoes">
          <Button variant="outline" size="sm" className="border-primary/30 hover:bg-primary/10">
            Ver Todas
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <Card className="border-primary/20">
          <CardContent className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-primary">Carregando suas redações...</p>
          </CardContent>
        </Card>
      ) : error ? (
        <Card className="border-red-200">
          <CardContent className="text-center py-8">
            <p className="text-red-600">Erro ao carregar redações.</p>
          </CardContent>
        </Card>
      ) : !redacoesTurma || redacoesTurma.length === 0 ? (
        <Card className="border-primary/20">
          <CardContent className="text-center py-8">
            <FileText className="w-12 h-12 text-primary/50 mx-auto mb-4" />
            <p className="text-primary/70 mb-4">
              Você ainda não enviou nenhuma redação.
            </p>
            <Link to="/envie-redacao">
              <Button className="bg-primary hover:bg-primary/90">
                Enviar Primeira Redação
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {redacoesTurma.slice(0, 3).map((redacao) => (
            <Card key={redacao.id} className="border-primary/20 hover:shadow-lg transition-shadow">
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <h3 className="font-semibold text-primary leading-tight pr-2">
                      {redacao.frase_tematica}
                    </h3>
                    
                    <div className="flex flex-wrap gap-2 shrink-0">
                      {redacao.corrigida ? (
                        <Badge className="bg-green-100 text-green-800 text-xs">
                          ✅ Corrigido
                        </Badge>
                      ) : (
                        <Badge className="bg-yellow-100 text-yellow-800 text-xs">
                          ⏳ Aguardando
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-primary" />
                      <span>{redacao.corretor_nome}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-primary" />
                      <span>{formatDate(redacao.data_envio)}</span>
                    </div>
                  </div>
                  
                  <div className="flex justify-end pt-2 border-t border-muted/20">
                    {redacao.corrigida ? (
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="border-primary/30 hover:bg-primary/10 hover:border-primary"
                        onClick={() => handleViewRedacao(redacao)}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Ver Correção
                      </Button>
                    ) : (
                      <div className="px-3 py-2 text-sm text-muted-foreground border border-muted rounded-md bg-muted/10">
                        <Clock className="w-4 h-4 inline mr-2" />
                        Aguardando correção
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal de visualização da redação */}
      {authenticatedRedacao && showRedacaoDialog && (
        <Dialog open={showRedacaoDialog} onOpenChange={(open) => {
          if (!open) {
            resetState();
          }
          setShowRedacaoDialog(open);
        }}>
          <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
            <RedacaoEnviadaCard 
              redacao={{
                id: authenticatedRedacao.id,
                frase_tematica: authenticatedRedacao.frase_tematica,
                redacao_texto: authenticatedRedacao.redacao_texto,
                data_envio: authenticatedRedacao.data_envio,
                nota_c1: authenticatedRedacao.nota_c1,
                nota_c2: authenticatedRedacao.nota_c2,
                nota_c3: authenticatedRedacao.nota_c3,
                nota_c4: authenticatedRedacao.nota_c4,
                nota_c5: authenticatedRedacao.nota_c5,
                nota_total: authenticatedRedacao.nota_total,
                comentario_admin: authenticatedRedacao.comentario_admin,
                corrigida: authenticatedRedacao.corrigida,
                data_correcao: authenticatedRedacao.data_correcao,
                nome_aluno: authenticatedRedacao.nome_aluno,
                email_aluno: authenticatedRedacao.email_aluno,
                tipo_envio: authenticatedRedacao.tipo_envio,
                status: authenticatedRedacao.status,
                turma: userType === "aluno" ? (alunoTurma || "") : "visitante",
              }} 
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};
