import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  Users,
  UserCheck,
  Trophy,
  MessageSquare,
  Award
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useProcessoSeletivoAdmin } from "@/hooks/useProcessoSeletivoAdmin";
import { PSFormBuilder } from "@/components/admin/processo-seletivo/PSFormBuilder";
import { PSCandidatosManager } from "@/components/admin/processo-seletivo/PSCandidatosManager";
import { PSComunicadoForm } from "@/components/admin/processo-seletivo/PSComunicadoForm";
import { PSEtapaFinalConfig } from "@/components/admin/processo-seletivo/PSEtapaFinalConfig";
import { PSResultadosManager } from "@/components/admin/processo-seletivo/PSResultadosManager";
import { PSProcessoSelector } from "@/components/admin/processo-seletivo/PSProcessoSelector";
import { ModernAdminHeader } from "@/components/admin/ModernAdminHeader";
import { ProcessoSeletivoAdminProvider, useProcessoSeletivoAdminContext } from "@/contexts/ProcessoSeletivoAdminContext";

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

// Conteúdo interno que usa o contexto
const ProcessoSeletivoAdminContent = () => {
  const hoje = new Date();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState("gerenciar");
  const [activeSection, setActiveSection] = useState("candidatos");

  // Usar o contexto para gerenciar o ID do processo selecionado
  const { processoSelecionadoId, setProcessoSelecionadoId } = useProcessoSeletivoAdminContext();

  const {
    formularios,
    formularioAtivo,
    formularioIdEfetivo,
    estatisticas,
    isLoadingFormularios,
    criarFormularioAsync,
    arquivarFormulario,
    desarquivarFormulario,
    isSalvandoFormulario,
    isArquivandoFormulario
  } = useProcessoSeletivoAdmin(processoSelecionadoId);

  // Sincronizar o ID selecionado com o ID efetivo do hook
  useEffect(() => {
    if (formularioIdEfetivo && !processoSelecionadoId) {
      setProcessoSelecionadoId(formularioIdEfetivo);
    }
  }, [formularioIdEfetivo, processoSelecionadoId, setProcessoSelecionadoId]);

  // Buscar contagem de candidatos por formulário
  const { data: candidatosPorFormulario = {} } = useQuery({
    queryKey: ['ps-candidatos-por-formulario'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ps_candidatos')
        .select('formulario_id');

      if (error) {
        console.error('Erro ao buscar candidatos:', error);
        return {};
      }

      // Contar candidatos por formulário
      const contagem: Record<string, number> = {};
      (data || []).forEach(c => {
        contagem[c.formulario_id] = (contagem[c.formulario_id] || 0) + 1;
      });
      return contagem;
    },
    staleTime: 30 * 1000
  });

  const handleCriarFormulario = async (titulo: string, descricao?: string) => {
    const resultado = await criarFormularioAsync({
      titulo,
      descricao,
      ativo: true
    });
    if (resultado?.id) {
      setProcessoSelecionadoId(resultado.id);
    }
    return resultado;
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/admin/login');
  };

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

  // Seções para os chips de navegação
  const sections = [
    { id: 'candidatos', label: 'Candidatos', icon: Users, badge: estatisticas.aguardandoAnalise },
    { id: 'comunicado', label: 'Comunicado', icon: MessageSquare },
    { id: 'etapa-final', label: 'Etapa Final', icon: Trophy },
    { id: 'resultados', label: 'Resultados', icon: Award },
    { id: 'elegiveis', label: 'Elegíveis', icon: UserCheck },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <ModernAdminHeader
        userEmail={user?.email}
        onLogout={handleLogout}
      />

      {/* Breadcrumb Navigation */}
      <nav className="bg-white/80 backdrop-blur-sm border-b border-primary/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 py-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/admin')}
              className="hover:bg-primary/10 text-primary"
            >
              Dashboard
            </Button>
            <span className="text-primary/40">/</span>
            <span className="text-primary font-semibold">
              Processo Seletivo
            </span>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Título */}
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">Processo Seletivo</h1>
          </div>

          {/* Seletor de Processo */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <PSProcessoSelector
              formularios={formularios || []}
              formularioSelecionadoId={processoSelecionadoId}
              onSelectFormulario={setProcessoSelecionadoId}
              onCriarFormulario={handleCriarFormulario}
              onArquivarFormulario={arquivarFormulario}
              onDesarquivarFormulario={desarquivarFormulario}
              isLoading={isLoadingFormularios}
              isCriando={isSalvandoFormulario}
              candidatosPorFormulario={candidatosPorFormulario}
            />
          </div>

          {/* Tabs Principais */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="gerenciar">Gerenciar Processo</TabsTrigger>
          <TabsTrigger value="configurar">Configurações</TabsTrigger>
        </TabsList>

        {/* Tab: Gerenciar */}
        <TabsContent value="gerenciar">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
            {/* Header com Chips */}
            <div className="flex flex-wrap items-center gap-3 p-4 border-b border-gray-200">
              <div className="flex gap-2 overflow-x-auto pb-1 flex-1">
                {sections.map((section) => {
                  const Icon = section.icon;
                  return (
                    <button
                      key={section.id}
                      type="button"
                      onClick={() => setActiveSection(section.id)}
                      className={cn(
                        "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-2 text-white",
                        activeSection === section.id
                          ? "bg-[#662F96]"
                          : "bg-[#B175FF] hover:bg-[#662F96]"
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      {section.label}
                      {section.badge && section.badge > 0 && (
                        <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                          {section.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Área de Conteúdo */}
            <div className="p-5">
              {activeSection === 'candidatos' && <PSCandidatosManager />}
              {activeSection === 'comunicado' && <PSComunicadoForm />}
              {activeSection === 'etapa-final' && <PSEtapaFinalConfig />}
              {activeSection === 'resultados' && <PSResultadosManager />}
              {activeSection === 'elegiveis' && (
                <div className="space-y-6">
                  {/* Alunos Elegíveis */}
                  <div className="border border-gray-200 rounded-xl p-5">
                    <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
                      <Users className="w-5 h-5 text-green-600" />
                      Alunos Elegíveis para o Processo Seletivo
                    </h3>
                    <p className="text-sm text-gray-500 mb-4">
                      Alunos sem plano ativo que ainda não participaram do processo seletivo
                    </p>
                    {isLoadingElegiveis ? (
                      <div className="text-center py-8 text-gray-500">Carregando...</div>
                    ) : alunosElegiveis.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        Nenhum aluno elegível no momento
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50">
                            <tr className="border-b">
                              <th className="text-left py-3 px-4 font-medium text-gray-600">Nome</th>
                              <th className="text-left py-3 px-4 font-medium text-gray-600">Email</th>
                              <th className="text-left py-3 px-4 font-medium text-gray-600">Turma</th>
                            </tr>
                          </thead>
                          <tbody>
                            {alunosElegiveis.map((aluno) => (
                              <tr key={aluno.id} className="border-b hover:bg-gray-50">
                                <td className="py-3 px-4">{aluno.nome} {aluno.sobrenome}</td>
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
                  </div>

                  {/* Alunos que já participaram */}
                  <div className="border border-gray-200 rounded-xl p-5">
                    <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
                      <UserCheck className="w-5 h-5 text-blue-600" />
                      Alunos que Já Participaram
                    </h3>
                    <p className="text-sm text-gray-500 mb-4">
                      Histórico de alunos que participaram do processo seletivo
                    </p>
                    {isLoadingParticiparam ? (
                      <div className="text-center py-8 text-gray-500">Carregando...</div>
                    ) : alunosParticiparam.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        Nenhum aluno participou ainda
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50">
                            <tr className="border-b">
                              <th className="text-left py-3 px-4 font-medium text-gray-600">Nome</th>
                              <th className="text-left py-3 px-4 font-medium text-gray-600">Email</th>
                              <th className="text-left py-3 px-4 font-medium text-gray-600">Turma</th>
                            </tr>
                          </thead>
                          <tbody>
                            {alunosParticiparam.map((aluno) => (
                              <tr key={aluno.id} className="border-b hover:bg-gray-50">
                                <td className="py-3 px-4">{aluno.nome} {aluno.sobrenome}</td>
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
                  </div>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

          {/* Tab: Configurações */}
          <TabsContent value="configurar">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
              <div className="p-5">
                <PSFormBuilder />
              </div>
            </div>
          </TabsContent>
        </Tabs>
        </div>
      </main>
    </div>
  );
};

// Componente wrapper que fornece o contexto
const ProcessoSeletivoAdmin = () => {
  return (
    <ProcessoSeletivoAdminProvider>
      <ProcessoSeletivoAdminContent />
    </ProcessoSeletivoAdminProvider>
  );
};

export default ProcessoSeletivoAdmin;
