import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { LogOut, Settings, UserCircle, Phone, MapPin, Calendar as CalendarIcon, School, GraduationCap } from "lucide-react";
import { useStudentAuth } from "@/hooks/useStudentAuth";
import { useAuth } from "@/hooks/useAuth";
import { useProfessorAuth } from "@/hooks/useProfessorAuth";
import { useToast } from "@/hooks/use-toast";
import { StudentAvatar } from "@/components/StudentAvatar";
import { BreadcrumbNavigation } from "@/components/BreadcrumbNavigation";
import { useSubscription } from "@/hooks/useSubscription";
import { InboxNotificationIcon } from "@/components/student/InboxNotificationIcon";
import { supabase } from "@/integrations/supabase/client";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface StudentHeaderProps {
  pageTitle?: string;
}

export const StudentHeader = ({ pageTitle }: StudentHeaderProps) => {
  const { studentData, logoutStudent } = useStudentAuth();
  const { user, isAdmin } = useAuth();
  const { professor, logout: logoutProfessor } = useProfessorAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Buscar subscription com o email correto
  const userEmail = studentData.email || studentData.emailUsuario || '';
  const { data: subscription } = useSubscription(userEmail);

  const [drawerOpen, setDrawerOpen] = useState(false);

  // Dados adicionais do perfil
  const [profileData, setProfileData] = useState<any>(null);

  // Debug: ver dados de subscription
  useEffect(() => {
    if (subscription) {
      console.log('Dados de subscription carregados:', subscription);
    }
  }, [subscription]);

  // Carregar dados do perfil quando o drawer abrir
  useEffect(() => {
    const carregarDadosPerfil = async () => {
      if (drawerOpen && studentData.email) {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('email', studentData.email)
          .single();

        if (data && !error) {
          setProfileData(data);
        }
      }
    };

    carregarDadosPerfil();
  }, [drawerOpen, studentData.email]);

  const handleLogout = () => {
    if (professor) {
      logoutProfessor();
      return;
    }
    logoutStudent();
    toast({
      title: "Sessão encerrada",
      description: "Você foi desconectado com sucesso.",
    });
    navigate('/login', { replace: true });
  };

  // Nome e turma exibidos no header — professor tem prioridade sobre aluno
  const nomeExibido = professor
    ? professor.nome_completo
    : (studentData.nomeUsuario || 'Usuário');

  const turmaExibida = professor
    ? null
    : (studentData.userType === "aluno" ? studentData.turma : null);

  const emailExibido = studentData.email || studentData.emailUsuario || '';

  return (
    <>
      <header className="bg-primary shadow-lg sticky top-0 z-50 rounded-b-3xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            {/* Logo à esquerda */}
            <Link
              to={professor ? "/professor/dashboard" : "/app"}
              className="flex items-center gap-3 hover:opacity-90 transition-opacity duration-200"
            >
              <img
                src="/lovable-uploads/d073fb44-8fd6-46e0-9ca1-f74baca3bb5b.png"
                alt="App do Redator"
                className="h-12 w-auto"
              />
              <span className="font-bold text-xl text-primary-foreground hidden sm:inline">
                App do Redator
              </span>
            </Link>

            {/* Controles do usuário à direita */}
            <div className="flex items-center gap-4">
              {/* Ícone de notificações do Inbox */}
              <InboxNotificationIcon />

              {/* Link para Admin apenas se for admin autenticado e não estiver como professor */}
              {user && isAdmin && !professor && (
                <Link
                  to="/admin"
                  className="flex items-center gap-2 bg-secondary/20 text-primary-foreground px-3 py-2 rounded-xl hover:bg-secondary/30 transition-colors duration-200 text-sm font-medium"
                >
                  <Settings className="w-4 h-4" />
                  <span className="hidden sm:inline">Admin</span>
                </Link>
              )}

              {/* Avatar clicável que abre drawer */}
              <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
                <SheetTrigger asChild>
                  <button className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                    <StudentAvatar size="sm" showUpload={false} />
                  </button>
                </SheetTrigger>
<SheetContent side="right" className="w-[320px] sm:w-[380px] overflow-y-auto">
                  <SheetHeader>
                    <SheetTitle>Meu Perfil</SheetTitle>
                  </SheetHeader>

                  <div className="mt-6 space-y-6">
                    {/* Avatar grande */}
                    <div className="flex justify-center">
                      <StudentAvatar size="lg" showUpload={true} />
                    </div>

                    {/* Seção: Dados Principais */}
                    <div className="space-y-3">
                      <h3 className="font-semibold text-sm text-gray-500 uppercase">Dados Principais</h3>

                      <div className="space-y-2">
                        <p className="font-semibold text-base">{nomeExibido}</p>
                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                          <span className="text-gray-400">✉️</span>
                          {emailExibido}
                        </p>

                        {profileData?.whatsapp && (
                          <p className="text-sm text-muted-foreground flex items-center gap-2">
                            <Phone className="w-3.5 h-3.5 text-gray-400" />
                            {profileData.whatsapp}
                          </p>
                        )}

                        {profileData?.cidade && (
                          <p className="text-sm text-muted-foreground flex items-center gap-2">
                            <MapPin className="w-3.5 h-3.5 text-gray-400" />
                            {profileData.cidade}
                          </p>
                        )}

                        {profileData?.data_nascimento && (
                          <p className="text-sm text-muted-foreground flex items-center gap-2">
                            <CalendarIcon className="w-3.5 h-3.5 text-gray-400" />
                            {new Date(profileData.data_nascimento).toLocaleDateString('pt-BR')}
                          </p>
                        )}
                      </div>
                    </div>

                    <Separator />

                    {/* Seção: Dados Escolares */}
                    {(turmaExibida || profileData?.escola || profileData?.serie) && (
                      <>
                        <div className="space-y-3">
                          <h3 className="font-semibold text-sm text-gray-500 uppercase">Dados Escolares</h3>

                          <div className="space-y-2">
                            {turmaExibida && (
                              <p className="text-sm flex items-center gap-2">
                                <GraduationCap className="w-3.5 h-3.5 text-gray-400" />
                                <span className="text-muted-foreground">Turma:</span>
                                <span className="font-medium">{turmaExibida}</span>
                              </p>
                            )}

                            {profileData?.escola && (
                              <p className="text-sm flex items-center gap-2">
                                <School className="w-3.5 h-3.5 text-gray-400" />
                                <span className="text-muted-foreground">Escola:</span>
                                <span className="font-medium">{profileData.escola}</span>
                              </p>
                            )}

                            {profileData?.serie && (
                              <p className="text-sm flex items-center gap-2">
                                <span className="text-gray-400">📚</span>
                                <span className="text-muted-foreground">Série:</span>
                                <span className="font-medium">{profileData.serie}</span>
                              </p>
                            )}
                          </div>
                        </div>
                        <Separator />
                      </>
                    )}

                    {/* Seção: Assinatura */}
                    <>
                      <div className="space-y-3">
                        <h3 className="font-semibold text-sm text-gray-500 uppercase">Assinatura</h3>

                        {subscription ? (
                          <div className="space-y-3">
                            {/* Plano */}
                            {subscription.plano ? (
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Plano:</span>
                                <Badge variant="secondary" className="px-3 py-1">
                                  {subscription.plano === 'Bolsista' ? 'Bolsista' : `Plano ${subscription.plano}`}
                                </Badge>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Plano:</span>
                                <span className="text-sm text-gray-400">Sem plano ativo</span>
                              </div>
                            )}

                            {/* Status */}
                            {subscription.status && (
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Status:</span>
                                <Badge
                                  variant={subscription.status === 'Ativo' ? 'default' : 'secondary'}
                                  className="px-3 py-1"
                                >
                                  {subscription.status}
                                </Badge>
                              </div>
                            )}

                            {/* Créditos */}
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">Créditos:</span>
                              <Badge variant="outline" className="px-3 py-1 font-semibold">
                                {subscription.creditos || 0}
                              </Badge>
                            </div>

                            {/* Data de Validade */}
                            {subscription.data_validade && (
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Validade:</span>
                                <span className="text-sm font-medium">
                                  {new Date(subscription.data_validade).toLocaleDateString('pt-BR')}
                                </span>
                              </div>
                            )}

                            {/* Dias Restantes */}
                            {subscription.dias_restantes !== undefined && subscription.status === 'Ativo' && (
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Dias restantes:</span>
                                <span className={`text-sm font-semibold ${
                                  subscription.dias_restantes <= 7 ? 'text-orange-600' :
                                  subscription.dias_restantes <= 30 ? 'text-yellow-600' :
                                  'text-green-600'
                                }`}>
                                  {subscription.dias_restantes} {subscription.dias_restantes === 1 ? 'dia' : 'dias'}
                                </span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-400">Carregando informações...</p>
                        )}
                      </div>
                      <Separator />
                    </>

                    {/* Botões de Ação */}
                    <div className="space-y-3">
                      <Link to="/editar-perfil" onClick={() => setDrawerOpen(false)}>
                        <Button
                          variant="outline"
                          className="w-full flex items-center justify-center gap-2"
                        >
                          <UserCircle className="w-4 h-4" />
                          Editar Perfil
                        </Button>
                      </Link>

                      <Button
                        onClick={() => {
                          setDrawerOpen(false);
                          handleLogout();
                        }}
                        variant="destructive"
                        className="w-full flex items-center justify-center gap-2"
                      >
                        <LogOut className="w-4 h-4" />
                        Sair da conta
                      </Button>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </header>
      <BreadcrumbNavigation />
    </>
  );
};
