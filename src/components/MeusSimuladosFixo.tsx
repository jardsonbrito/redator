
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileText, Calendar, User, Eye, AlertCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { RedacaoEnviadaCard } from "./RedacaoEnviadaCard";

interface RedacaoSimulado {
  id: string;
  nome_aluno: string;
  email_aluno: string;
  data_envio: string;
  corrigida: boolean;
  nota_total: number | null;
  data_correcao: string | null;
  frase_tematica: string;
  texto: string;
  turma: string;
  nota_c1: number | null;
  nota_c2: number | null;
  nota_c3: number | null;
  nota_c4: number | null;
  nota_c5: number | null;
}

interface MeusSimuladosFixoProps {
  turmaCode: string;
}

export const MeusSimuladosFixo = ({ turmaCode }: MeusSimuladosFixoProps) => {
  const [selectedRedacao, setSelectedRedacao] = useState<RedacaoSimulado | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const { toast } = useToast();

  // Recuperar dados do usuário logado
  const userType = localStorage.getItem("userType");
  const alunoTurma = localStorage.getItem("alunoTurma");
  const visitanteData = localStorage.getItem("visitanteData");

  // Determinar email do usuário logado
  let currentUserEmail = "";
  let nomeCompleto = "";
  
  if (userType === "aluno" && alunoTurma) {
    const turmasMap = {
      "Turma A": "LRA2025",
      "Turma B": "LRB2025", 
      "Turma C": "LRC2025",
      "Turma D": "LRD2025",
      "Turma E": "LRE2025"
    };
    const codeTurma = turmasMap[alunoTurma as keyof typeof turmasMap] || "";
    currentUserEmail = `aluno.${codeTurma.toLowerCase()}@laboratoriodoredator.com`;
    nomeCompleto = `Aluno da ${alunoTurma}`;
  } else if (userType === "visitante" && visitanteData) {
    try {
      const dados = JSON.parse(visitanteData);
      currentUserEmail = dados.email;
      nomeCompleto = dados.nome;
    } catch (error) {
      console.error('❌ Erro ao parsear dados do visitante:', error);
    }
  }

  console.log('🔍 MeusSimuladosFixo - Email do usuário:', currentUserEmail);

  const { data: redacoesSimulado, isLoading, error, refetch } = useQuery({
    queryKey: ['meus-simulados', currentUserEmail],
    queryFn: async () => {
      if (!currentUserEmail) {
        console.log('❌ Nenhum e-mail de usuário identificado para simulados');
        return [];
      }

      console.log('🔍 Buscando redações de simulado do usuário:', currentUserEmail);

      const { data, error } = await supabase
        .from('redacoes_simulado')
        .select(`
          id,
          nome_aluno,
          email_aluno,
          data_envio,
          corrigida,
          nota_total,
          data_correcao,
          texto,
          turma,
          nota_c1,
          nota_c2,
          nota_c3,
          nota_c4,
          nota_c5,
          simulados!inner(
            frase_tematica
          )
        `)
        .eq('email_aluno', currentUserEmail.toLowerCase()) // Filtro específico por email
        .eq('corrigida', true) // Apenas redações corrigidas
        .order('data_envio', { ascending: false })
        .limit(5);

      if (error) {
        console.error('❌ Erro ao buscar simulados:', error);
        throw error;
      }

      const redacoesFormatadas = data.map(redacao => ({
        ...redacao,
        frase_tematica: (redacao.simulados as any)?.frase_tematica || 'Simulado'
      }));

      console.log('✅ Redações de simulado encontradas:', redacoesFormatadas.length);
      return redacoesFormatadas;
    },
    enabled: !!currentUserEmail,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const handleViewRedacao = (redacao: RedacaoSimulado) => {
    console.log('👁️ Visualizando redação de simulado:', redacao.id);
    setSelectedRedacao(redacao);
    setShowDialog(true);
  };

  if (!currentUserEmail) {
    return (
      <Card className="border-redator-accent/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-redator-primary">
            <FileText className="w-5 h-5" />
            📝 Meus Simulados
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-6">
          <p className="text-redator-accent">
            🔐 Faça login para ver seus simulados corrigidos.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="border-redator-accent/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-redator-primary">
            <FileText className="w-5 h-5" />
            📝 Meus Simulados
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-6">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
          <p className="text-redator-accent">Carregando seus simulados...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertCircle className="w-5 h-5" />
            ❌ Erro
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-6">
          <p className="text-red-600 mb-4">Erro ao carregar simulados.</p>
          <Button onClick={() => refetch()} variant="outline" size="sm">
            Tentar novamente
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!redacoesSimulado || redacoesSimulado.length === 0) {
    return (
      <Card className="border-redator-accent/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-redator-primary">
            <FileText className="w-5 h-5" />
            📝 Meus Simulados
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-6">
          <p className="text-redator-accent mb-2">
            Você ainda não tem simulados corrigidos.
          </p>
          <p className="text-xs text-gray-500">
            👤 Logado como: {nomeCompleto} ({currentUserEmail})
          </p>
          <Button onClick={() => refetch()} variant="outline" size="sm" className="mt-3">
            Verificar novamente
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-redator-accent/20">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-redator-primary">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              📝 Meus Simulados ({redacoesSimulado.length})
            </div>
            <Button onClick={() => refetch()} variant="outline" size="sm">
              Atualizar
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-xs text-gray-500 mb-4 p-2 bg-gray-50 rounded">
            👤 Exibindo simulados de: {nomeCompleto} ({currentUserEmail})
          </div>

          <div className="space-y-3">
            {redacoesSimulado.map((redacao) => (
              <div
                key={redacao.id}
                className="border border-redator-accent/20 rounded-lg p-3 hover:shadow-sm transition-shadow cursor-pointer"
                onClick={() => handleViewRedacao(redacao)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-redator-primary text-sm line-clamp-1 mb-1">
                      {redacao.frase_tematica}
                    </h3>
                    <div className="flex items-center gap-4 text-xs text-redator-accent">
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        <span className="truncate">{redacao.nome_aluno}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>{formatDate(redacao.data_envio)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge className="bg-orange-100 text-orange-800 text-xs">
                      Simulado
                    </Badge>
                    {redacao.nota_total !== null && (
                      <span className="text-xs font-medium text-redator-primary">
                        📊 {redacao.nota_total}/1000
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {selectedRedacao && (
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-redator-primary flex items-center gap-2">
                <Eye className="w-5 h-5" />
                📝 {selectedRedacao.frase_tematica}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6">
              <div className="bg-orange-50 border-2 border-orange-200 p-3 rounded">
                <p className="text-sm text-orange-800 font-medium">
                  🎯 Simulado - Redação Corrigida
                </p>
              </div>
              
              <RedacaoEnviadaCard 
                redacao={{
                  id: selectedRedacao.id,
                  frase_tematica: selectedRedacao.frase_tematica,
                  redacao_texto: selectedRedacao.texto,
                  data_envio: selectedRedacao.data_envio,
                  nota_c1: selectedRedacao.nota_c1,
                  nota_c2: selectedRedacao.nota_c2,
                  nota_c3: selectedRedacao.nota_c3,
                  nota_c4: selectedRedacao.nota_c4,
                  nota_c5: selectedRedacao.nota_c5,
                  nota_total: selectedRedacao.nota_total,
                  comentario_admin: null,
                  corrigida: selectedRedacao.corrigida,
                  data_correcao: selectedRedacao.data_correcao,
                  nome_aluno: selectedRedacao.nome_aluno,
                  email_aluno: selectedRedacao.email_aluno,
                  tipo_envio: 'simulado',
                  status: 'corrigida',
                  turma: selectedRedacao.turma,
                }} 
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};
