import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Search } from "lucide-react";
import { AulaGravadaCardPadrao } from "@/components/shared/AulaGravadaCardPadrao";
interface Aula {
  id: string;
  titulo: string;
  descricao: string;
  modulo: string;
  link_conteudo: string;
  pdf_url?: string;
  pdf_nome?: string;
  turmas_autorizadas: string[] | null;
  permite_visitante: boolean;
  ativo: boolean;
  criado_em: string;
}

export const AulaList = () => {
  const [aulas, setAulas] = useState<Aula[]>([]);
  const [filteredAulas, setFilteredAulas] = useState<Aula[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [moduloFilter, setModuloFilter] = useState("");

  const modulosDisponiveis = [
    'Competência 1',
    'Competência 2',
    'Competência 3',
    'Competência 4',
    'Competência 5',
    'Aula ao vivo'
  ];

  useEffect(() => {
    fetchAulas();
  }, []);

  useEffect(() => {
    filterAulas();
  }, [aulas, searchTerm, moduloFilter]);

  const fetchAulas = async () => {
    try {
      console.log('🔍 Buscando aulas...');
      const { data, error } = await supabase
        .from("aulas")
        .select(`
          *,
          modulos!inner(nome)
        `)
        .order("criado_em", { ascending: false });

      console.log('✅ Dados recebidos:', data);
      console.log('❌ Erro:', error);

      if (error) throw error;
      setAulas((data || []).map(aula => ({
        ...aula,
        modulo: aula.modulos?.nome || 'Sem módulo'
      })));
    } catch (error) {
      console.error("Erro ao buscar aulas:", error);
      toast.error("Erro ao carregar aulas");
    } finally {
      setIsLoading(false);
    }
  };

  const filterAulas = () => {
    let filtered = aulas;

    if (searchTerm) {
      filtered = filtered.filter(aula =>
        aula.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        aula.descricao.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (moduloFilter) {
      filtered = filtered.filter(aula => aula.modulo === moduloFilter);
    }

    setFilteredAulas(filtered);
  };

  const handleDelete = async (id: string) => {
    // Buscar informações da aula para mostrar na confirmação
    const aula = aulas.find(a => a.id === id);
    const tituloAula = aula?.titulo || 'esta aula';

    const confirmDelete = window.confirm(
      `Tem certeza que deseja excluir "${tituloAula}"?\n\nEsta ação não pode ser desfeita e todos os dados relacionados à aula serão perdidos permanentemente.`
    );

    if (!confirmDelete) {
      return; // Usuário cancelou a exclusão
    }

    try {
      const { error } = await supabase
        .from("aulas")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Aula excluída com sucesso!");
      fetchAulas();
    } catch (error) {
      console.error("Erro ao excluir aula:", error);
      toast.error("Erro ao excluir aula");
    }
  };

  const toggleAtivo = async (id: string, ativo: boolean) => {
    try {
      const { error } = await supabase
        .from("aulas")
        .update({ ativo: !ativo })
        .eq("id", id);

      if (error) throw error;

      toast.success(`Aula ${!ativo ? 'ativada' : 'desativada'} com sucesso!`);
      fetchAulas();
    } catch (error) {
      console.error("Erro ao alterar status:", error);
      toast.error("Erro ao alterar status da aula");
    }
  };


  const handleAssistir = (id: string) => {
    const aula = aulas.find(a => a.id === id);
    if (aula?.link_conteudo) {
      window.open(aula.link_conteudo, '_blank');
    }
  };

  const handleEdit = (id: string) => {
    // TODO: Implementar navegação para edição
    console.log('Editando aula:', id);
    toast.info('Funcionalidade de edição será implementada em breve');
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Filtros skeleton */}
        <Card>
          <CardHeader>
            <div className="h-6 bg-gray-200 rounded animate-pulse"></div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
            </div>
          </CardContent>
        </Card>

        {/* Cards skeleton */}
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="overflow-hidden">
              <div className="aspect-[16/9] bg-gray-200 animate-pulse"></div>
              <div className="p-6 space-y-3">
                <div className="h-6 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div>
                <div className="flex gap-2">
                  <div className="h-6 bg-gray-200 rounded animate-pulse w-20"></div>
                  <div className="h-6 bg-gray-200 rounded animate-pulse w-16"></div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Input
                placeholder="Buscar por título ou descrição..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div>
              <Select value={moduloFilter} onValueChange={setModuloFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por módulo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos os módulos</SelectItem>
                  {modulosDisponiveis.map((modulo) => (
                    <SelectItem key={modulo} value={modulo}>
                      {modulo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

{/* Lista de Aulas */}
      <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {filteredAulas.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="text-center py-8">
              <p className="text-gray-500">Nenhuma aula encontrada.</p>
            </CardContent>
          </Card>
        ) : (
          filteredAulas.map((aula) => (
            <AulaGravadaCardPadrao
              key={aula.id}
              aula={aula}
              perfil="admin"
              actions={{
                onAssistir: () => handleAssistir(aula.id),
                onBaixarPdf: aula.pdf_url ? () => window.open(aula.pdf_url!, '_blank') : undefined,
                onEditar: () => handleEdit(aula.id),
                onDesativar: () => toggleAtivo(aula.id, aula.ativo),
                onExcluir: () => handleDelete(aula.id),
              }}
            />
          ))
        )}
      </div>
    </div>
  );
};
