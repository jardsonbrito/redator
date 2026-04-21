import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Save } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { StudentHeader } from "@/components/StudentHeader";
import { BottomNavigation } from "@/components/BottomNavigation";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useStudentAuth } from "@/hooks/useStudentAuth";
import { StudentAvatar } from "@/components/StudentAvatar";
import { useSubscription } from "@/hooks/useSubscription";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

export default function EditarPerfil() {
  const { studentData } = useStudentAuth();
  const { data: subscription } = useSubscription(studentData.emailUsuario || '');

  // Seção 1 - Perfil
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [emailAtual, setEmailAtual] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [cidade, setCidade] = useState("");

  // Seção 2 - Escolar
  const [escola, setEscola] = useState("");
  const [serie, setSerie] = useState("");

  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Carregar dados do perfil ao montar componente
  useEffect(() => {
    const carregarDadosPerfil = async () => {
      if (studentData.nomeUsuario) {
        setNome(studentData.nomeUsuario);
      }

      const userEmail = studentData.email || studentData.emailUsuario || "";
      if (userEmail) {
        setEmail(userEmail);
        setEmailAtual(userEmail);

        // Buscar dados adicionais do perfil no banco
        const { data: profileData, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('email', userEmail)
          .single();

        if (profileData && !error) {
          // Preencher campos que existem no banco
          setWhatsapp(profileData.whatsapp || "");
          setDataNascimento(profileData.data_nascimento || "");
          setCidade(profileData.cidade || "");
          setEscola(profileData.escola || "");
          setSerie(profileData.serie || "");
        }
      }
    };

    carregarDadosPerfil();
  }, [studentData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nome.trim()) {
      toast({
        title: "Erro",
        description: "O nome não pode estar vazio.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Verificar se o email foi alterado
      const emailMudou = email.trim() !== emailAtual.trim();

      if (emailMudou) {
        // Usar a função RPC para atualizar o email
        const { data, error } = await supabase
          .rpc('update_student_email', {
            current_email: emailAtual.trim(),
            new_email: email.trim()
          });

        if (error) {
          throw error;
        }

        const result = data as any;
        if (!result.success) {
          throw new Error(result.message || "Erro ao atualizar email");
        }
      }

      // Preparar objeto de atualização
      const updateData: any = {
        nome: nome.trim()
      };

      // Adicionar campos opcionais se preenchidos
      if (whatsapp.trim()) updateData.whatsapp = whatsapp.trim();
      if (dataNascimento) updateData.data_nascimento = dataNascimento;
      if (cidade.trim()) updateData.cidade = cidade.trim();
      if (escola.trim()) updateData.escola = escola.trim();
      if (serie.trim()) updateData.serie = serie.trim();

      // Atualizar dados na tabela profiles
      const { error: updateError } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('email', emailAtual.trim());

      if (updateError) {
        throw updateError;
      }

      toast({
        title: "Perfil atualizado!",
        description: "Suas informações foram salvas com sucesso.",
      });

      // Aguardar um pouco e redirecionar
      setTimeout(() => {
        navigate('/app');
      }, 1500);

    } catch (error: any) {
      console.error("Erro ao atualizar perfil:", error);
      toast({
        title: "Erro na atualização",
        description: error.message || "Não foi possível atualizar o perfil.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-secondary/20 via-secondary/10 to-secondary/5 pb-20">
        <StudentHeader />

        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6">
            <Link
              to="/app"
              className="inline-flex items-center gap-2 text-primary hover:text-primary/80 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </Link>
          </div>

          <div className="space-y-6">
            {/* SEÇÃO 1 — PERFIL */}
            <Card>
              <CardHeader>
                <CardTitle>Perfil</CardTitle>
                <CardDescription>Informações pessoais básicas</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Foto de perfil */}
                  <div className="flex flex-col items-center gap-4 pb-6">
                    <StudentAvatar size="lg" showUpload={true} />
                    <p className="text-sm text-muted-foreground text-center">
                      Clique na foto para alterar
                    </p>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Nome Completo */}
                    <div className="md:col-span-2 space-y-2">
                      <Label htmlFor="nome">Nome Completo *</Label>
                      <Input
                        id="nome"
                        type="text"
                        value={nome}
                        onChange={(e) => setNome(e.target.value)}
                        placeholder="Digite seu nome completo"
                        disabled={loading}
                        required
                      />
                    </div>

                    {/* Email */}
                    <div className="space-y-2">
                      <Label htmlFor="email">E-mail *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="seu@email.com"
                        disabled={loading}
                        required
                      />
                      {email !== emailAtual && (
                        <p className="text-xs text-orange-600">
                          ⚠️ Alterar o e-mail afetará seu login
                        </p>
                      )}
                    </div>

                    {/* WhatsApp */}
                    <div className="space-y-2">
                      <Label htmlFor="whatsapp">WhatsApp</Label>
                      <Input
                        id="whatsapp"
                        type="tel"
                        value={whatsapp}
                        onChange={(e) => setWhatsapp(e.target.value)}
                        placeholder="(00) 00000-0000"
                        disabled={loading}
                      />
                    </div>

                    {/* Data de Nascimento */}
                    <div className="space-y-2">
                      <Label htmlFor="dataNascimento">Data de Nascimento</Label>
                      <Input
                        id="dataNascimento"
                        type="date"
                        value={dataNascimento}
                        onChange={(e) => setDataNascimento(e.target.value)}
                        disabled={loading}
                      />
                    </div>

                    {/* Cidade */}
                    <div className="space-y-2">
                      <Label htmlFor="cidade">Cidade</Label>
                      <Input
                        id="cidade"
                        type="text"
                        value={cidade}
                        onChange={(e) => setCidade(e.target.value)}
                        placeholder="Sua cidade"
                        disabled={loading}
                      />
                    </div>
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* SEÇÃO 2 — ESCOLAR */}
            <Card>
              <CardHeader>
                <CardTitle>Dados Escolares</CardTitle>
                <CardDescription>Informações sobre sua formação</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Escola de Origem */}
                  <div className="space-y-2">
                    <Label htmlFor="escola">Escola de Origem</Label>
                    <Input
                      id="escola"
                      type="text"
                      value={escola}
                      onChange={(e) => setEscola(e.target.value)}
                      placeholder="Nome da sua escola"
                      disabled={loading}
                    />
                  </div>

                  {/* Série/Ano */}
                  <div className="space-y-2">
                    <Label htmlFor="serie">Série/Ano</Label>
                    <Input
                      id="serie"
                      type="text"
                      value={serie}
                      onChange={(e) => setSerie(e.target.value)}
                      placeholder="Ex: 3º ano"
                      disabled={loading}
                    />
                  </div>

                  {/* Turma (somente leitura) */}
                  {studentData.userType === 'aluno' && studentData.turma && (
                    <div className="space-y-2">
                      <Label htmlFor="turma">Turma</Label>
                      <Input
                        id="turma"
                        type="text"
                        value={studentData.turma}
                        disabled
                        className="bg-gray-100"
                      />
                      <p className="text-xs text-muted-foreground">
                        A turma é definida pela administração
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* SEÇÃO 3 — ASSINATURA */}
            {subscription && subscription.plano && (
              <Card>
                <CardHeader>
                  <CardTitle>Dados de Assinatura</CardTitle>
                  <CardDescription>Informações do seu plano atual</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Plano Atual */}
                    <div className="space-y-2">
                      <Label>Plano Atual</Label>
                      <div className="flex items-center h-10">
                        <Badge variant="secondary" className="text-base">
                          {subscription.plano === 'Bolsista' ? 'Bolsista' : `Plano ${subscription.plano}`}
                        </Badge>
                      </div>
                    </div>

                    {/* Status */}
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <div className="flex items-center h-10">
                        <Badge
                          variant={subscription.status === 'Ativo' ? 'default' : 'secondary'}
                          className="text-base"
                        >
                          {subscription.status || 'Inativo'}
                        </Badge>
                      </div>
                    </div>

                    {/* Créditos */}
                    <div className="space-y-2">
                      <Label>Créditos Disponíveis</Label>
                      <div className="flex items-center h-10">
                        <Badge variant="outline" className="text-base font-semibold">
                          {subscription.creditos || 0}
                        </Badge>
                      </div>
                    </div>

                    {/* Data de Validade */}
                    {subscription.data_validade && (
                      <div className="space-y-2">
                        <Label>Validade</Label>
                        <Input
                          type="text"
                          value={new Date(subscription.data_validade).toLocaleDateString('pt-BR')}
                          disabled
                          className="bg-gray-100"
                        />
                      </div>
                    )}

                    {/* Dias Restantes */}
                    {subscription.dias_restantes !== undefined && subscription.status === 'Ativo' && (
                      <div className="space-y-2">
                        <Label>Dias Restantes</Label>
                        <Input
                          type="text"
                          value={`${subscription.dias_restantes} ${subscription.dias_restantes === 1 ? 'dia' : 'dias'}`}
                          disabled
                          className={`bg-gray-100 font-semibold ${
                            subscription.dias_restantes <= 7 ? 'text-orange-600' :
                            subscription.dias_restantes <= 30 ? 'text-yellow-600' :
                            'text-green-600'
                          }`}
                        />
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-4">
                    Para alterar seu plano ou adicionar créditos, entre em contato com a administração
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Botões de Ação */}
            <div className="flex gap-4">
              <Button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1"
              >
                {loading ? (
                  "Salvando..."
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Salvar Alterações
                  </>
                )}
              </Button>
              <Link to="/app" className="flex-1">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  disabled={loading}
                >
                  Cancelar
                </Button>
              </Link>
            </div>
          </div>
        </main>

        <BottomNavigation />
      </div>
    </ProtectedRoute>
  );
}
