import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Users,
  UserCheck,
  Clock,
  FileText,
  MessageSquare,
  Trophy,
  CheckCircle,
  XCircle,
  Play
} from "lucide-react";
import { ListChecks } from "phosphor-react";
import { useProcessoSeletivoAdmin } from "@/hooks/useProcessoSeletivoAdmin";
import { PSFormBuilder } from "@/components/admin/processo-seletivo/PSFormBuilder";
import { PSCandidatosManager } from "@/components/admin/processo-seletivo/PSCandidatosManager";
import { PSComunicadoForm } from "@/components/admin/processo-seletivo/PSComunicadoForm";
import { PSEtapaFinalConfig } from "@/components/admin/processo-seletivo/PSEtapaFinalConfig";

interface AlunoElegivel {
  id: string;
  nome: string;
  sobrenome: string;
  email: string;
  turma: string | null;
  created_at: string | null;
}

interface AlunoParticipou {
  id: string;
  nome: string;
  sobrenome: string;
  email: string;
  turma: string | null;
}

const ProcessoSeletivoAdmin = () => {
  const navigate = useNavigate();
  const hoje = new Date();
  const [activeTab, setActiveTab] = useState("formulario");

  const {
    formularioAtivo,
    estatisticas,
    isLoadingFormularioAtivo
  } = useProcessoSeletivoAdmin();

  // Buscar alunos elegíveis (sem plano ativo e não participaram)
  const { data: alunosElegiveis = [], isLoading: isLoadingElegiveis } = useQuery({
    queryKey: ['processo-seletivo-elegiveis'],
    queryFn: async (): Promise<AlunoElegivel[]> => {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, nome, sobrenome, email, turma, created_at, participou_processo_seletivo')
        .eq('user_type', 'aluno')
        .eq('participou_processo_seletivo', false);

      if (profilesError) {
        console.error('Erro ao buscar profiles:', profilesError);
        return [];
      }

      const { data: assinaturasAtivas } = await supabase
        .from('assinaturas')
        .select('aluno_id')
        .gte('data_validade', hoje.toISOString().split('T')[0]);

      const alunosComPlanoAtivo = new Set(assinaturasAtivas?.map(a => a.aluno_id) || []);

      return (profiles || [])
        .filter(p => !alunosComPlanoAtivo.has(p.id))
        .map(p => ({
          id: p.id,
          nome: p.nome,
          sobrenome: p.sobrenome,
          email: p.email,
          turma: p.turma,
          created_at: p.created_at
        }));
    },
    staleTime: 2 * 60 * 1000
  });

  // Buscar alunos que já participaram
  const { data: alunosParticiparam = [], isLoading: isLoadingParticiparam } = useQuery({
    queryKey: ['processo-seletivo-participaram'],
    queryFn: async (): Promise<AlunoParticipou[]> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, nome, sobrenome, email, turma')
        .eq('user_type', 'aluno')
        .eq('participou_processo_seletivo', true);

      if (error) {
        console.error('Erro ao buscar participantes:', error);
        return [];
      }

      return data || [];
    },
    staleTime: 2 * 60 * 1000
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/admin')}
              className="hover:bg-primary/10"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <ListChecks size={24} color="#8B5CF6" weight="fill" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Processo Seletivo</h1>
                <p className="text-sm text-gray-500">
                  {formularioAtivo ? (
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      {formularioAtivo.titulo}
                    </span>
                  ) : (
                    'Nenhum formulário ativo'
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Cards de Resumo */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-full">
                  <Users className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Elegíveis</p>
                  <p className="text-xl font-bold text-gray-900">
                    {isLoadingElegiveis ? '...' : alunosElegiveis.length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-full">
                  <Clock className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Aguardando</p>
                  <p className="text-xl font-bold text-gray-900">
                    {estatisticas.aguardandoAnalise}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 rounded-full">
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Aprovados</p>
                  <p className="text-xl font-bold text-gray-900">
                    {estatisticas.aprovados}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-full">
                  <XCircle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Reprovados</p>
                  <p className="text-xl font-bold text-gray-900">
                    {estatisticas.reprovados}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-full">
                  <Play className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Etapa Final</p>
                  <p className="text-xl font-bold text-gray-900">
                    {estatisticas.etapaFinalLiberada}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-full">
                  <Trophy className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Concluídos</p>
                  <p className="text-xl font-bold text-gray-900">
                    {estatisticas.concluidos}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs Principais */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-6">
            <TabsTrigger value="formulario" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Formulário</span>
            </TabsTrigger>
            <TabsTrigger value="candidatos" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Candidatos</span>
              {estatisticas.aguardandoAnalise > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 px-1.5">
                  {estatisticas.aguardandoAnalise}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="comunicado" className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              <span className="hidden sm:inline">Comunicado</span>
            </TabsTrigger>
            <TabsTrigger value="etapa-final" className="flex items-center gap-2">
              <Trophy className="w-4 h-4" />
              <span className="hidden sm:inline">Etapa Final</span>
            </TabsTrigger>
            <TabsTrigger value="elegiveis" className="flex items-center gap-2">
              <UserCheck className="w-4 h-4" />
              <span className="hidden sm:inline">Elegíveis</span>
            </TabsTrigger>
          </TabsList>

          {/* Tab: Formulário */}
          <TabsContent value="formulario">
            <PSFormBuilder />
          </TabsContent>

          {/* Tab: Candidatos */}
          <TabsContent value="candidatos">
            <PSCandidatosManager />
          </TabsContent>

          {/* Tab: Comunicado */}
          <TabsContent value="comunicado">
            <PSComunicadoForm />
          </TabsContent>

          {/* Tab: Etapa Final */}
          <TabsContent value="etapa-final">
            <PSEtapaFinalConfig />
          </TabsContent>

          {/* Tab: Elegíveis */}
          <TabsContent value="elegiveis">
            <div className="space-y-6">
              {/* Alunos Elegíveis */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="w-5 h-5 text-green-600" />
                    Alunos Elegíveis para o Processo Seletivo
                  </CardTitle>
                  <p className="text-sm text-gray-500">
                    Alunos sem plano ativo que ainda não participaram do processo seletivo
                  </p>
                </CardHeader>
                <CardContent>
                  {isLoadingElegiveis ? (
                    <div className="text-center py-8 text-gray-500">Carregando...</div>
                  ) : alunosElegiveis.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      Nenhum aluno elegível no momento
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-3 px-4 font-medium text-gray-600">Nome</th>
                            <th className="text-left py-3 px-4 font-medium text-gray-600">Email</th>
                            <th className="text-left py-3 px-4 font-medium text-gray-600">Turma</th>
                          </tr>
                        </thead>
                        <tbody>
                          {alunosElegiveis.map((aluno) => (
                            <tr key={aluno.id} className="border-b hover:bg-gray-50">
                              <td className="py-3 px-4">
                                {aluno.nome} {aluno.sobrenome}
                              </td>
                              <td className="py-3 px-4 text-gray-600">{aluno.email}</td>
                              <td className="py-3 px-4">
                                {aluno.turma ? (
                                  <Badge variant="outline">{aluno.turma}</Badge>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Alunos que já participaram */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <UserCheck className="w-5 h-5 text-blue-600" />
                    Alunos que Já Participaram
                  </CardTitle>
                  <p className="text-sm text-gray-500">
                    Histórico de alunos que participaram do processo seletivo
                  </p>
                </CardHeader>
                <CardContent>
                  {isLoadingParticiparam ? (
                    <div className="text-center py-8 text-gray-500">Carregando...</div>
                  ) : alunosParticiparam.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      Nenhum aluno participou ainda
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-3 px-4 font-medium text-gray-600">Nome</th>
                            <th className="text-left py-3 px-4 font-medium text-gray-600">Email</th>
                            <th className="text-left py-3 px-4 font-medium text-gray-600">Turma</th>
                          </tr>
                        </thead>
                        <tbody>
                          {alunosParticiparam.map((aluno) => (
                            <tr key={aluno.id} className="border-b hover:bg-gray-50">
                              <td className="py-3 px-4">
                                {aluno.nome} {aluno.sobrenome}
                              </td>
                              <td className="py-3 px-4 text-gray-600">{aluno.email}</td>
                              <td className="py-3 px-4">
                                {aluno.turma ? (
                                  <Badge variant="outline">{aluno.turma}</Badge>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default ProcessoSeletivoAdmin;
