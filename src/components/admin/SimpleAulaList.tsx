import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Trash2, ExternalLink, FileText, Edit, Search, Calendar, Grid, List } from "lucide-react";
import { AulaForm } from "./AulaForm";
import { UnifiedCard, UnifiedCardSkeleton, type BadgeTone } from "@/components/ui/unified-card";
import { resolveAulaCover } from "@/utils/coverUtils";

interface Modulo {
  id: string;
  nome: string;
  slug?: string;
}

interface Aula {
  id: string;
  titulo: string;
  descricao: string | null;
  modulo: string;
  modulo_id?: string;
  modulos?: Modulo;
  link_conteudo: string;
  pdf_url: string | null;
  pdf_nome: string | null;
  turmas_autorizadas: string[] | null;
  permite_visitante: boolean | null;
  ativo: boolean | null;
  criado_em: string | null;
  // Video metadata fields
  video_thumbnail_url?: string | null;
  platform?: string | null;
  video_id?: string | null;
  embed_url?: string | null;
  video_url_original?: string | null;
  cover_source?: string | null;
  cover_file_path?: string | null;
  cover_url?: string | null;
}

export const SimpleAulaList = () => {
  const [aulas, setAulas] = useState<Aula[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aulaEditando, setAulaEditando] = useState<Aula | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [busca, setBusca] = useState('');
  const [moduloFiltro, setModuloFiltro] = useState('todos');
  const [showGrouped, setShowGrouped] = useState(false);

  // Buscar módulos únicos das aulas existentes
  const [modulos, setModulos] = useState<string[]>([]);

  // Função para buscar módulos únicos das aulas
  const fetchModulos = async () => {
    // Usar módulos baseados na consulta que fiz diretamente na base de dados
    const modulosExistentes = [
      'Competência 1',
      'Competência 2', 
      'Competência 3',
      'Competência 4',
      'Competência 5',
      'Redatoria',
      'Aula ao vivo'
    ];
    setModulos(modulosExistentes);
  };

  const fetchAulas = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      let query = supabase
        .from("aulas")
        .select("*")
        .order("criado_em", { ascending: false });

      if (busca) {
        query = query.or(`titulo.ilike.%${busca}%,descricao.ilike.%${busca}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // Filtrar por módulo no frontend já que temos problemas com join
      let aulasFiltered = data || [];
      if (moduloFiltro && moduloFiltro !== 'todos') {
        // Mapear módulos para IDs reais da base de dados
        const moduloIds: { [key: string]: string } = {
          'Competência 1': 'e951e007-2e33-4491-9cde-883ffc691f24', 
          'Competência 2': '62c8f686-b03a-4175-8bb2-1812e7d46128',
          'Competência 3': '17bc8189-a4ee-4c5a-a604-f188c2699188', 
          'Competência 4': '65c74163-0e9a-4d16-b142-ef4eade26c13',
          'Competência 5': '40b054c6-0df4-4b63-99ba-0fe9f315ef3c',
          'Redatoria': '1ef05609-c5ed-418e-90ee-4968f29ebfd9',
          'Aula ao vivo': 'b14dd9be-a203-45df-97b7-ae592f5c60ed'
        };
        
        // Filtrar por modulo_id baseado no nome selecionado
        const moduloId = moduloIds[moduloFiltro];
        if (moduloId) {
          aulasFiltered = aulasFiltered.filter((aula: any) => aula.modulo_id === moduloId);
        }
      }
      
      setAulas(aulasFiltered);
    } catch (err: any) {
      console.error("Erro ao buscar aulas:", err);
      setError(err.message || "Erro ao carregar aulas");
      toast.error("Erro ao carregar aulas");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta aula?")) return;

    try {
      const { error } = await supabase
        .from("aulas")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Aula excluída com sucesso!");
      fetchAulas();
    } catch (err: any) {
      console.error("Erro ao excluir aula:", err);
      toast.error("Erro ao excluir aula");
    }
  };

  const toggleAtivo = async (id: string, ativo: boolean | null) => {
    try {
      const { error } = await supabase
        .from("aulas")
        .update({ ativo: !ativo })
        .eq("id", id);

      if (error) throw error;

      toast.success(`Aula ${!ativo ? 'ativada' : 'desativada'} com sucesso!`);
      fetchAulas();
    } catch (err: any) {
      console.error("Erro ao alterar status:", err);
      toast.error("Erro ao alterar status da aula");
    }
  };

  const handleEdit = (aula: Aula) => {
    setAulaEditando(aula);
    setShowForm(true);
  };

  const handleCancelEdit = () => {
    setAulaEditando(null);
    setShowForm(false);
  };

  const handleSuccess = () => {
    setAulaEditando(null);
    setShowForm(false);
    fetchAulas();
  };

  useEffect(() => {
    fetchModulos();
    fetchAulas();
  }, [busca, moduloFiltro]);

  // Buscar módulos inicialmente
  useEffect(() => {
    fetchModulos();
  }, []);

  // Agrupar aulas por módulo
  const aulasAgrupadas = aulas?.reduce((grupos: any, aula: any) => {
    // Mapear modulo_id para nome do módulo usando IDs reais
    const moduloNomes: { [key: string]: string } = {
      'e951e007-2e33-4491-9cde-883ffc691f24': 'Competência 1',
      '62c8f686-b03a-4175-8bb2-1812e7d46128': 'Competência 2', 
      '17bc8189-a4ee-4c5a-a604-f188c2699188': 'Competência 3',
      '65c74163-0e9a-4d16-b142-ef4eade26c13': 'Competência 4',
      '40b054c6-0df4-4b63-99ba-0fe9f315ef3c': 'Competência 5',
      '1ef05609-c5ed-418e-90ee-4968f29ebfd9': 'Redatoria',
      'b14dd9be-a203-45df-97b7-ae592f5c60ed': 'Aula ao vivo'
    };
    
    const moduloNome = moduloNomes[aula.modulo_id] || 'Sem módulo';
    
    if (!grupos[moduloNome]) {
      grupos[moduloNome] = [];
    }
    grupos[moduloNome].push(aula);
    return grupos;
  }, {}) || {};

if (isLoading) {
    return (
      <div className="space-y-4">
        <UnifiedCardSkeleton />
        <UnifiedCardSkeleton />
        <UnifiedCardSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <p className="text-red-500">Erro: {error}</p>
          <Button onClick={fetchAulas} className="mt-2">
            Tentar Novamente
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (showForm) {
    return (
      <div className="space-y-4">
        <AulaForm 
          aulaEditando={aulaEditando}
          onSuccess={handleSuccess}
          onCancelEdit={handleCancelEdit}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="grid md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Buscar aulas..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={moduloFiltro} onValueChange={setModuloFiltro}>
            <SelectTrigger>
              <SelectValue placeholder="Módulo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              {modulos.map((modulo) => (
                <SelectItem key={modulo} value={modulo}>
                  {modulo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div></div>

          <div className="flex items-center gap-2">
            <Button
              variant={showGrouped ? "default" : "outline"}
              size="sm"
              onClick={() => setShowGrouped(!showGrouped)}
            >
              {showGrouped ? <List className="w-4 h-4 mr-2" /> : <Grid className="w-4 h-4 mr-2" />}
              {showGrouped ? 'Lista' : 'Agrupar'}
            </Button>
            <div className="text-sm text-gray-600 flex items-center">
              <Calendar className="w-4 h-4 mr-2" />
              {aulas?.length || 0} aula(s)
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Aulas Cadastradas</h2>
        <div className="flex gap-2">
          <Button onClick={() => setShowForm(true)} variant="default" size="sm">
            Nova Aula
          </Button>
          <Button onClick={fetchAulas} variant="outline" size="sm">
            Atualizar
          </Button>
        </div>
      </div>

      {aulas.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-gray-500">Nenhuma aula encontrada.</p>
          </CardContent>
        </Card>
      ) : showGrouped ? (
        <div className="space-y-8">
          {/* Exibir aulas agrupadas por módulo */}
          {Object.keys(aulasAgrupadas).map((moduloNome) => {
            const aulasModulo = aulasAgrupadas[moduloNome] || [];
            
            return (
              <div key={moduloNome} className="space-y-4">
                <div className="flex items-center gap-3">
                  <h3 className="text-xl font-bold text-primary">
                    {moduloNome}
                  </h3>
                  <Badge variant="outline" className="text-sm">
                    {aulasModulo.length} aula(s)
                  </Badge>
                </div>
                
                {aulasModulo.length === 0 ? (
                  <Card className="border-dashed">
                    <CardContent className="text-center py-8">
                      <p className="text-gray-500">Nenhuma aula neste módulo</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4">
                    {aulasModulo.map((aula) => {
                      const coverUrl = resolveAulaCover(aula);
            const badges: { label: string; tone?: BadgeTone }[] = [];
                      const moduloNomes: { [key: string]: string } = {
                        'e951e007-2e33-4491-9cde-883ffc691f24': 'Competência 1',
                        '62c8f686-b03a-4175-8bb2-1812e7d46128': 'Competência 2',
                        '17bc8189-a4ee-4c5a-a604-f188c2699188': 'Competência 3',
                        '65c74163-0e9a-4d16-b142-ef4eade26c13': 'Competência 4',
                        '40b054c6-0df4-4b63-99ba-0fe9f315ef3c': 'Competência 5',
                        '1ef05609-c5ed-418e-90ee-4968f29ebfd9': 'Redatoria',
                        'b14dd9be-a203-45df-97b7-ae592f5c60ed': 'Aula ao vivo'
                      };
                      if ((aula as any).modulo_id && moduloNomes[(aula as any).modulo_id]) {
                        badges.push({ label: moduloNomes[(aula as any).modulo_id], tone: 'primary' });
            }
                      if (aula.platform) badges.push({ label: aula.platform.toUpperCase(), tone: 'neutral' });
                      badges.push({ label: aula.ativo ? 'Ativo' : 'Inativo', tone: aula.ativo ? 'success' : 'neutral' });

                      const meta = [
                        ...(aula.turmas_autorizadas && aula.turmas_autorizadas.length > 0
                          ? [{ icon: ExternalLink, text: `Turmas: ${aula.turmas_autorizadas.join(', ')}` }]
                          : []),
                        ...(aula.criado_em ? [{ icon: ExternalLink, text: `Criado em: ${new Date(aula.criado_em).toLocaleString('pt-BR')}` }] : []),
                      ];

                      const actions = [
                        { icon: ExternalLink, label: 'Abrir', onClick: () => window.open(aula.link_conteudo, '_blank') },
                        ...(aula.pdf_url ? [{ icon: FileText, label: 'PDF', onClick: () => window.open(aula.pdf_url!, '_blank') }] : []),
                        { icon: Edit, label: 'Editar', onClick: () => handleEdit(aula) },
                        { icon: Edit, label: aula.ativo ? 'Desativar' : 'Ativar', onClick: () => toggleAtivo(aula.id, aula.ativo) },
                        { icon: Trash2, label: 'Excluir', onClick: () => handleDelete(aula.id), tone: 'danger' as const },
                      ];

                      return (
                        <UnifiedCard
                          key={aula.id}
                          variant="admin"
                          item={{
                            id: aula.id,
                            module: 'aulas',
                            coverUrl,
                            title: aula.titulo,
                            subtitle: aula.descricao || undefined,
                            badges,
                            meta,
                            actions,
                          }}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid gap-4">
          {aulas.map((aula) => {
            const coverUrl = resolveAulaCover(aula);
                      const badges: { label: string; tone?: BadgeTone }[] = [];
            const moduloNomes: { [key: string]: string } = {
              'e951e007-2e33-4491-9cde-883ffc691f24': 'Competência 1',
              '62c8f686-b03a-4175-8bb2-1812e7d46128': 'Competência 2',
              '17bc8189-a4ee-4c5a-a604-f188c2699188': 'Competência 3',
              '65c74163-0e9a-4d16-b142-ef4eade26c13': 'Competência 4',
              '40b054c6-0df4-4b63-99ba-0fe9f315ef3c': 'Competência 5',
              '1ef05609-c5ed-418e-90ee-4968f29ebfd9': 'Redatoria',
              'b14dd9be-a203-45df-97b7-ae592f5c60ed': 'Aula ao vivo'
            };
                      if ((aula as any).modulo_id && moduloNomes[(aula as any).modulo_id]) {
                        badges.push({ label: moduloNomes[(aula as any).modulo_id], tone: 'primary' });
                      }
            if (aula.platform) badges.push({ label: aula.platform.toUpperCase(), tone: 'neutral' });
            badges.push({ label: aula.ativo ? 'Ativo' : 'Inativo', tone: aula.ativo ? 'success' : 'neutral' });

            const meta = [
              ...(aula.turmas_autorizadas && aula.turmas_autorizadas.length > 0
                ? [{ icon: ExternalLink, text: `Turmas: ${aula.turmas_autorizadas.join(', ')}` }]
                : []),
              ...(aula.criado_em ? [{ icon: ExternalLink, text: `Criado em: ${new Date(aula.criado_em).toLocaleString('pt-BR')}` }] : []),
            ];

            const actions = [
              { icon: ExternalLink, label: 'Abrir', onClick: () => window.open(aula.link_conteudo, '_blank') },
              ...(aula.pdf_url ? [{ icon: FileText, label: 'PDF', onClick: () => window.open(aula.pdf_url!, '_blank') }] : []),
              { icon: Edit, label: 'Editar', onClick: () => handleEdit(aula) },
              { icon: Edit, label: aula.ativo ? 'Desativar' : 'Ativar', onClick: () => toggleAtivo(aula.id, aula.ativo) },
              { icon: Trash2, label: 'Excluir', onClick: () => handleDelete(aula.id), tone: 'danger' as const },
            ];

            return (
              <UnifiedCard
                key={aula.id}
                variant="admin"
                item={{
                  id: aula.id,
                  module: 'aulas',
                  coverUrl,
                  title: aula.titulo,
                  subtitle: aula.descricao || undefined,
                  badges,
                  meta,
                  actions,
                }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};