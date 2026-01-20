import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Home, LogOut, Users } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { ExportarAlunosModal } from "@/components/admin/ExportarAlunosModal";

export default function Exportacao() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, signOut } = useAuth();
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [isAlunosModalOpen, setIsAlunosModalOpen] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    signOut();
  };

  const formatDate = () => {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${day}-${month}-${year}_${hours}${minutes}${seconds}`;
  };

  const downloadCSV = (data: any[], filename: string) => {
    if (data.length === 0) {
      toast({
        title: "Nenhum dado encontrado",
        description: "Não há dados para exportar nesta categoria.",
        variant: "destructive",
      });
      return;
    }

    const headers = Object.keys(data[0]).join(';');
    const csvContent = [headers, ...data.map(row => 
      Object.values(row).map(value => 
        typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value
      ).join(';')
    )].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}_${formatDate()}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const exportTemas = async () => {
    setIsLoading('temas');
    try {
      const { data, error } = await supabase
        .from('temas')
        .select('*')
        .order('published_at', { ascending: false, nullsFirst: false })
        .order('id', { ascending: false }); // Fallback para temas sem published_at

      if (error) throw error;

      const csvData = data.map(item => ({
        'Frase Temática': item.frase_tematica || '',
        'Eixo': item.eixo_tematico || '',
        'Status': item.status || '',
        'Cabeçalho ENEM': item.cabecalho_enem || '',
        'Motivador 1': item.texto_1 || '',
        'Motivador 2': item.texto_2 || '',
        'Motivador 3': item.texto_3 || '',
        'URL Imagem': item.imagem_texto_4_url || ''
      }));

      downloadCSV(csvData, 'temas_exportados');
      toast({
        title: "Exportação concluída",
        description: "Temas exportados com sucesso!",
      });
    } catch (error) {
      console.error('Erro ao exportar temas:', error);
      toast({
        title: "Erro na exportação",
        description: "Não foi possível exportar os temas.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(null);
    }
  };

  const exportRedacoes = async () => {
    setIsLoading('redacoes');
    try {
      const { data, error } = await supabase
        .from('redacoes')
        .select('*')
        .order('data_envio', { ascending: false });

      if (error) throw error;

      const csvData = data.map(item => ({
        'Frase Temática': item.frase_tematica || '',
        'Eixo': item.eixo_tematico || '',
        'Redação Exemplar': item.conteudo || '',
        'Dica de Escrita': item.dica_de_escrita || '',
        'URL Imagem': item.pdf_url || ''
      }));

      downloadCSV(csvData, 'redacoes_exportadas');
      toast({
        title: "Exportação concluída",
        description: "Redações exportadas com sucesso!",
      });
    } catch (error) {
      console.error('Erro ao exportar redações:', error);
      toast({
        title: "Erro na exportação",
        description: "Não foi possível exportar as redações.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(null);
    }
  };

  const exportExercicios = async () => {
    setIsLoading('exercicios');
    try {
      const { data, error } = await supabase
        .from('exercicios')
        .select('*')
        .order('criado_em', { ascending: false });

      if (error) throw error;

      const csvData = data.map(item => ({
        'Título': item.titulo || '',
        'Tipo': item.tipo || '',
        'Turmas': item.turmas_autorizadas ? item.turmas_autorizadas.join(', ') : '',
        'Permite Visitante': item.permite_visitante ? 'Sim' : 'Não',
        'Ativo': item.ativo ? 'Sim' : 'Não'
      }));

      downloadCSV(csvData, 'exercicios_exportados');
      toast({
        title: "Exportação concluída",
        description: "Exercícios exportados com sucesso!",
      });
    } catch (error) {
      console.error('Erro ao exportar exercícios:', error);
      toast({
        title: "Erro na exportação",
        description: "Não foi possível exportar os exercícios.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(null);
    }
  };

  const exportAulas = async () => {
    setIsLoading('aulas');
    try {
      const { data, error } = await supabase
        .from('aulas')
        .select(`
          *,
          modulos!inner(nome)
        `)
        .order('criado_em', { ascending: false });

      if (error) throw error;

      const csvData = data.map(item => ({
        'Título': item.titulo || '',
        'Módulo': item.modulos?.nome || 'Sem módulo',
        'Descrição': item.descricao || '',
        'Link': item.link_conteudo || '',
        'Nome do PDF': item.pdf_nome || '',
        'URL PDF': item.pdf_url || '',
        'Turmas': item.turmas_autorizadas ? item.turmas_autorizadas.join(', ') : '',
        'Permite Visitante': item.permite_visitante ? 'Sim' : 'Não',
        'Ativo': item.ativo ? 'Sim' : 'Não',
        'Data de Criação': item.criado_em ? new Date(item.criado_em).toLocaleString('pt-BR') : ''
      }));

      downloadCSV(csvData, 'aulas_exportadas');
      toast({
        title: "Exportação concluída",
        description: "Aulas exportadas com sucesso!",
      });
    } catch (error) {
      console.error('Erro ao exportar aulas:', error);
      toast({
        title: "Erro na exportação",
        description: "Não foi possível exportar as aulas.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(null);
    }
  };

  const exportVideos = async () => {
    setIsLoading('videos');
    try {
      const { data, error } = await supabase
        .from('videos')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const csvData = data.map(item => ({
        'Título': item.titulo || '',
        'Categoria': item.categoria || '',
        'Link do YouTube': item.youtube_url || ''
      }));

      downloadCSV(csvData, 'videos_exportados');
      toast({
        title: "Exportação concluída",
        description: "Vídeos exportados com sucesso!",
      });
    } catch (error) {
      console.error('Erro ao exportar vídeos:', error);
      toast({
        title: "Erro na exportação",
        description: "Não foi possível exportar os vídeos.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(null);
    }
  };

  const exportBiblioteca = async () => {
    setIsLoading('biblioteca');
    try {
      const { data, error } = await supabase
        .from('biblioteca_materiais')
        .select(`
          *,
          categorias (
            nome
          )
        `)
        .order('criado_em', { ascending: false });

      if (error) throw error;

      const csvData = data.map(item => ({
        'Título': item.titulo || '',
        'Descrição': item.descricao || '',
        'Categoria': item.categorias?.nome || 'Não definida',
        'Nome do PDF': item.arquivo_nome || '',
        'Status': item.status || '',
        'Turmas': item.turmas_autorizadas ? item.turmas_autorizadas.join(', ') : '',
        'Visitantes': item.permite_visitante ? 'Sim' : 'Não',
        'Data': item.criado_em ? new Date(item.criado_em).toLocaleString('pt-BR') : ''
      }));

      downloadCSV(csvData, 'materiais_exportados');
      toast({
        title: "Exportação concluída",
        description: "Materiais da biblioteca exportados com sucesso!",
      });
    } catch (error) {
      console.error('Erro ao exportar biblioteca:', error);
      toast({
        title: "Erro na exportação",
        description: "Não foi possível exportar os materiais da biblioteca.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(null);
    }
  };

  const openAlunosModal = () => {
    setIsAlunosModalOpen(true);
  };

  const exportCards = [
    { id: 'temas', label: 'Temas', action: exportTemas },
    { id: 'redacoes', label: 'Redações Exemplares', action: exportRedacoes },
    { id: 'exercicios', label: 'Exercícios', action: exportExercicios },
    { id: 'aulas', label: 'Aulas', action: exportAulas },
    { id: 'videos', label: 'Vídeos', action: exportVideos },
    { id: 'biblioteca', label: 'Biblioteca', action: exportBiblioteca },
    { id: 'alunos', label: 'Alunos', action: openAlunosModal, isModal: true }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary/20 via-secondary/10 to-secondary/5">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-sm shadow-lg border-b border-primary/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Link to="/app" className="flex items-center gap-2 bg-primary/10 hover:bg-primary/20 px-3 py-2 rounded-lg transition-all duration-300 text-primary hover:text-primary font-medium">
                <Home className="w-5 h-5" />
                <span>Voltar ao App</span>
              </Link>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  Painel Administrativo
                </h1>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="bg-secondary/20 px-3 py-1 rounded-full">
                <span className="text-sm font-medium text-primary">Olá, {user?.email}</span>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleLogout}
                className="border-primary/20 hover:bg-primary hover:text-white transition-all duration-300"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
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
              Exportação de Dados
            </span>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {exportCards.map((card) => (
            <Card
              key={card.id}
              className="group cursor-pointer bg-gradient-to-br from-purple-500/10 to-violet-500/10 hover:from-purple-500/20 hover:to-violet-500/20 transition-all duration-300 border border-purple-200/50 hover:border-purple-300 hover:shadow-lg hover:shadow-purple-500/10"
              onClick={() => !isLoading && card.action()}
            >
              <CardContent className="p-8 flex flex-col items-center justify-center min-h-[160px]">
                <div className="p-4 bg-gradient-to-br from-purple-500/20 to-violet-500/20 rounded-full mb-4 group-hover:from-purple-500/30 group-hover:to-violet-500/30 transition-all duration-300">
                  {card.id === 'alunos' ? (
                    <Users className="w-8 h-8 text-purple-600 transition-all duration-300 group-hover:scale-110" />
                  ) : (
                    <Download
                      className={`w-8 h-8 text-purple-600 transition-all duration-300 ${
                        isLoading === card.id ? 'animate-pulse' : 'group-hover:scale-110'
                      }`}
                    />
                  )}
                </div>
                <span className="text-sm text-center text-purple-700 font-medium transition-opacity duration-300">
                  {card.label}
                </span>
                {isLoading === card.id && (
                  <div className="text-xs text-purple-500 mt-2 animate-pulse">
                    Exportando...
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </main>

      {/* Modal de Exportação de Alunos */}
      <ExportarAlunosModal
        isOpen={isAlunosModalOpen}
        onClose={() => setIsAlunosModalOpen(false)}
      />
    </div>
  );
}