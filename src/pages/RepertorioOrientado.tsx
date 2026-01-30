import { useState, useEffect, useMemo } from "react";
import { Plus, Star, Filter, RefreshCw, ArrowLeft, FileText, MessageSquareQuote } from "lucide-react";
import { StudentHeader } from "@/components/StudentHeader";
import { usePageTitle } from "@/hooks/useBreadcrumbs";
import { useStudentAuth } from "@/hooks/useStudentAuth";
import { useAuth } from "@/hooks/useAuth";
import { useRepertorio, calcularVotosResumo } from "@/hooks/useRepertorio";
import {
  RepertorioPublicacaoCard,
  RepertorioNovaPublicacaoForm,
  FrasesGrid,
} from "@/components/repertorio";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "react-router-dom";

const RepertorioOrientado = () => {
  usePageTitle("Repertório Orientado");
  const navigate = useNavigate();

  const { studentData, isStudentLoggedIn } = useStudentAuth();
  const { isAdmin: isAdminAuth, user: adminUser } = useAuth();

  const [showNovaPublicacaoModal, setShowNovaPublicacaoModal] = useState(false);
  const [filtroTipo, setFiltroTipo] = useState<string>("todos");
  const [activeTab, setActiveTab] = useState<string>("paragrafos");

  // Verificar sessão de admin no localStorage
  const [adminSession, setAdminSession] = useState<{ email: string; nome?: string } | null>(null);

  useEffect(() => {
    const storedSession = localStorage.getItem('admin_session');
    if (storedSession) {
      try {
        const parsed = JSON.parse(storedSession);
        setAdminSession(parsed);
      } catch (e) {
        console.error('Erro ao parsear admin_session:', e);
      }
    }
  }, []);

  // Determinar se é admin (via auth OU sessão local)
  const isAdmin = isAdminAuth || !!adminSession;

  const {
    publicacoes,
    destaques,
    todosVotos,
    todosComentarios,
    isLoading,
    getVotosPublicacao,
    getComentariosPublicacao,
    criarPublicacao,
    editarPublicacao,
    excluirPublicacao,
    toggleDestaque,
    votar,
    adicionarComentario,
    editarComentario,
    excluirComentario,
    buscarPerfilPorEmail,
    buscarOuCriarPerfilAdmin,
    refetchPublicacoes,
    isCriando,
    isVotando,
    isComentando,
  } = useRepertorio();

  // Determinar tipo de usuário e permissões
  const isVisitante = studentData.userType === "visitante";
  const isAluno = studentData.userType === "aluno";
  const isProfessor = false; // TODO: implementar detecção de professor
  const podePublicar = isAluno || isAdmin || isProfessor;
  const podeVotar = isAluno || isAdmin || isProfessor;

  // Obter ID do usuário atual
  const [usuarioAtualId, setUsuarioAtualId] = useState<string | undefined>();

  // Nome do usuário (priorizar admin se logado como admin)
  const usuarioNome = isAdmin
    ? (adminSession?.nome || adminUser?.email?.split('@')[0] || "Administrador")
    : (studentData.nomeUsuario || "Usuário");

  // Buscar perfil do usuário se estiver logado
  useEffect(() => {
    const fetchPerfil = async () => {
      // Determinar o email a usar (admin ou aluno)
      const emailParaBuscar = isAdmin
        ? (adminSession?.email || adminUser?.email)
        : studentData.email;

      if (emailParaBuscar) {
        if (isAdmin) {
          // Para admin, usar função que cria perfil se não existir
          const adminId = await buscarOuCriarPerfilAdmin(emailParaBuscar, usuarioNome);
          if (adminId) {
            setUsuarioAtualId(adminId);
          }
        } else {
          // Para aluno, apenas buscar
          const perfil = await buscarPerfilPorEmail(emailParaBuscar);
          if (perfil) {
            setUsuarioAtualId(perfil.id);
          }
        }
      }
    };
    fetchPerfil();
  }, [studentData.email, isAdmin, adminSession, adminUser, buscarPerfilPorEmail, buscarOuCriarPerfilAdmin, usuarioNome]);

  // Filtrar publicações
  const publicacoesFiltradas = useMemo(() => {
    if (filtroTipo === "todos") return publicacoes;
    return publicacoes.filter((p) => p.tipo_paragrafo === filtroTipo);
  }, [publicacoes, filtroTipo]);

  // Handlers
  const handleNovaPublicacao = async (
    fraseTematica: string,
    tipoParagrafo: "introducao" | "desenvolvimento" | "conclusao",
    paragrafo: string
  ) => {
    if (!usuarioAtualId) {
      console.error("Usuário não identificado");
      return;
    }

    await criarPublicacao({
      autor_id: usuarioAtualId,
      autor_nome: usuarioNome,
      autor_turma: studentData.turma || null,
      frase_tematica: fraseTematica,
      tipo_paragrafo: tipoParagrafo,
      paragrafo: paragrafo,
    });

    setShowNovaPublicacaoModal(false);
  };

  const handleVotar = async (
    publicacaoId: string,
    voto: "produtivo" | "nao_produtivo"
  ) => {
    if (!usuarioAtualId) return;
    await votar(publicacaoId, usuarioAtualId, voto);
  };

  const handleEditar = async (
    id: string,
    fraseTematica: string,
    tipoParagrafo: "introducao" | "desenvolvimento" | "conclusao",
    paragrafo: string
  ) => {
    await editarPublicacao(id, fraseTematica, tipoParagrafo, paragrafo);
  };

  const handleAdicionarComentario = async (
    publicacaoId: string,
    comentario: string
  ) => {
    if (!usuarioAtualId) return;
    const autorNome = isAdmin ? "Administrador" : usuarioNome;
    await adicionarComentario(publicacaoId, usuarioAtualId, autorNome, comentario);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header condicional - Admin ou Student */}
      {isAdmin ? (
        <header className="bg-white border-b border-gray-200 shadow-sm">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/admin')}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar ao Dashboard
              </Button>
              <div className="h-6 w-px bg-gray-300" />
              <h1 className="text-lg font-semibold text-gray-900">
                Repertório Orientado
              </h1>
              <span className="text-sm text-purple-600 font-medium bg-purple-100 px-2 py-1 rounded">
                Visualização Admin
              </span>
            </div>
          </div>
        </header>
      ) : (
        <StudentHeader pageTitle="Repertório Orientado" />
      )}

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Header com título */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Repertório Orientado
            </h1>
            {!isAdmin && (
              <p className="text-muted-foreground">
                Compartilhe parágrafos e frases com repertório para enriquecer suas redações
              </p>
            )}
          </div>
        </div>

        {/* Tabs para alternar entre Parágrafos e Frases */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2 bg-purple-100/70">
            <TabsTrigger
              value="paragrafos"
              className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-white"
            >
              <FileText className="h-4 w-4" />
              Parágrafos
            </TabsTrigger>
            <TabsTrigger
              value="frases"
              className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-white"
            >
              <MessageSquareQuote className="h-4 w-4" />
              Frases
            </TabsTrigger>
          </TabsList>

          {/* Conteúdo da aba Parágrafos */}
          <TabsContent value="paragrafos" className="mt-6 space-y-6">
            {/* Ações de Parágrafos */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center gap-3">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Filtrar por tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os tipos</SelectItem>
                    <SelectItem value="introducao">Introdução</SelectItem>
                    <SelectItem value="desenvolvimento">Desenvolvimento</SelectItem>
                    <SelectItem value="conclusao">Conclusão</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-sm text-muted-foreground">
                  {publicacoesFiltradas.length}{" "}
                  {publicacoesFiltradas.length === 1 ? "publicação" : "publicações"}
                </span>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetchPublicacoes()}
                >
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Atualizar
                </Button>

                {podePublicar && (
                  <Button onClick={() => setShowNovaPublicacaoModal(true)}>
                    <Plus className="h-4 w-4 mr-1" />
                    Novo Parágrafo
                  </Button>
                )}
              </div>
            </div>

            {/* Seção de Destaques */}
            {destaques.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                    Destaques
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="w-full whitespace-nowrap">
                    <div className="flex gap-4 pb-4">
                      {destaques.map((publicacao) => (
                        <div
                          key={publicacao.id}
                          className="w-[350px] flex-shrink-0"
                        >
                          <RepertorioPublicacaoCard
                            publicacao={publicacao}
                            votos={getVotosPublicacao(publicacao.id)}
                            comentarios={getComentariosPublicacao(publicacao.id)}
                            usuarioAtualId={usuarioAtualId}
                            usuarioNome={usuarioNome}
                            isAdmin={isAdmin}
                            isProfessor={isProfessor}
                            podeVotar={podeVotar}
                            onVotar={handleVotar}
                            onEditar={handleEditar}
                            onExcluir={excluirPublicacao}
                            onToggleDestaque={toggleDestaque}
                            onAdicionarComentario={handleAdicionarComentario}
                            onEditarComentario={editarComentario}
                            onExcluirComentario={excluirComentario}
                            isVotando={isVotando}
                            isComentando={isComentando}
                          />
                        </div>
                      ))}
                    </div>
                    <ScrollBar orientation="horizontal" />
                  </ScrollArea>
                </CardContent>
              </Card>
            )}

            {/* Feed de Publicações */}
            {isLoading ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Card key={i}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-3 w-16" />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Skeleton className="h-16 w-full" />
                      <Skeleton className="h-24 w-full" />
                      <Skeleton className="h-8 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : publicacoesFiltradas.length === 0 ? (
              <Card className="p-12 text-center">
                <div className="space-y-3">
                  <p className="text-lg font-medium text-gray-900">
                    Nenhuma publicação encontrada
                  </p>
                  <p className="text-muted-foreground">
                    {filtroTipo !== "todos"
                      ? "Tente mudar o filtro para ver mais publicações."
                      : "Seja o primeiro a compartilhar um parágrafo com repertório!"}
                  </p>
                  {podePublicar && filtroTipo === "todos" && (
                    <Button
                      className="mt-4"
                      onClick={() => setShowNovaPublicacaoModal(true)}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Criar Primeiro Parágrafo
                    </Button>
                  )}
                </div>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {publicacoesFiltradas.map((publicacao) => (
                  <RepertorioPublicacaoCard
                    key={publicacao.id}
                    publicacao={publicacao}
                    votos={getVotosPublicacao(publicacao.id)}
                    comentarios={getComentariosPublicacao(publicacao.id)}
                    usuarioAtualId={usuarioAtualId}
                    usuarioNome={usuarioNome}
                    isAdmin={isAdmin}
                    isProfessor={isProfessor}
                    podeVotar={podeVotar}
                    onVotar={handleVotar}
                    onEditar={handleEditar}
                    onExcluir={excluirPublicacao}
                    onToggleDestaque={toggleDestaque}
                    onAdicionarComentario={handleAdicionarComentario}
                    onEditarComentario={editarComentario}
                    onExcluirComentario={excluirComentario}
                    isVotando={isVotando}
                    isComentando={isComentando}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Conteúdo da aba Frases */}
          <TabsContent value="frases" className="mt-6">
            <FrasesGrid
              usuarioAtualId={usuarioAtualId}
              usuarioNome={usuarioNome}
              usuarioTurma={studentData.turma}
              isAdmin={isAdmin}
              podePublicar={podePublicar}
              podeCurtir={podeVotar}
            />
          </TabsContent>
        </Tabs>

        {/* Aviso para visitantes */}
        {isVisitante && (
          <Card className="bg-yellow-50 border-yellow-200">
            <CardContent className="py-4">
              <p className="text-sm text-yellow-800 text-center">
                Você está como visitante. Para publicar e interagir, faça login como aluno.
              </p>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Modal de Nova Publicação */}
      <RepertorioNovaPublicacaoForm
        open={showNovaPublicacaoModal}
        onOpenChange={setShowNovaPublicacaoModal}
        onSubmit={handleNovaPublicacao}
        isSubmitting={isCriando}
      />
    </div>
  );
};

export default RepertorioOrientado;
