import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { X as ClearIcon, ImageOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TemaForm } from './TemaForm';
import { useAdminTemasFilters } from '@/hooks/useAdminTemasFilters';
import { AutocompleteInput } from "@/components/filters/AutocompleteInput";
import { supabase } from '@/integrations/supabase/client';
import { TemaCardPadrao } from "@/components/shared/TemaCard";

export const TemaList = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);

  // Usar o hook de filtros admin
  const {
    temas,
    allTemas,
    isLoading,
    error,
    fraseFilter,
    statusFilter,
    tipoFilter,
    orderBy,
    statusOptions,
    tipoOptions,
    fraseSuggestions,
    hasActiveFilters,
    updateFraseFilter,
    updateStatusFilter,
    updateTipoFilter,
    updateOrderBy,
    clearFilters,
  } = useAdminTemasFilters();

  const temasSemCapa = (allTemas || []).filter(
    t => !t.cover_file_path && !t.cover_url && !t.imagem_texto_4_url
  );

  const refetch = async () => {
    await queryClient.invalidateQueries({ queryKey: ['admin-temas-all'] });
  };



  const toggleStatus = async (id: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'publicado' ? 'rascunho' : 'publicado';
      
      const { error } = await supabase
        .from('temas')
        .update({ 
          status: newStatus,
          // Clear scheduling if making it published manually
          ...(newStatus === 'publicado' && {
            published_at: new Date().toISOString(),
            scheduled_publish_at: null,
            scheduled_by: null
          })
        })
        .eq('id', id);

      if (error) throw error;

      // Invalidar queries para recarregar os dados
      await queryClient.invalidateQueries({ queryKey: ['admin-temas'] });

      toast({
        title: "✅ Status alterado",
        description: `Tema alterado para ${newStatus}.`,
      });

    } catch (error: any) {
      toast({
        title: "❌ Erro",
        description: error.message || "Erro ao alterar status do tema.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      console.log('🗑️ Iniciando exclusão do tema com ID:', id);

      // Buscar informações do tema para mostrar na confirmação
      const { data: tema, error: temaError } = await supabase
        .from('temas')
        .select('frase_tematica')
        .eq('id', id)
        .single();

      const tituloTema = tema?.frase_tematica || 'este tema';

      const confirmDelete = window.confirm(
        `Tem certeza que deseja excluir "${tituloTema}"?\n\nEsta ação não pode ser desfeita e todas as redações relacionadas a este tema serão afetadas.`
      );

      if (!confirmDelete) {
        return; // Usuário cancelou a exclusão
      }

      // Verificar autenticação do usuário
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('Usuário não autenticado');
      }
      console.log('✅ Usuário autenticado:', user.email);

      // Verificar se é admin usando a tabela admin_users
      const { data: adminUser, error: adminError } = await supabase
        .from('admin_users')
        .select('ativo')
        .eq('email', user.email?.toLowerCase())
        .eq('ativo', true)
        .single();

      if (adminError || !adminUser) {
        console.error('❌ Erro ao verificar permissões admin:', adminError);
        // Fallback para emails hardcoded (compatibilidade)
        const adminEmails = ['jardsonbrito@gmail.com', 'jarvisluz@gmail.com'];
        if (!adminEmails.includes(user.email?.toLowerCase() || '')) {
          throw new Error('Usuário não tem permissões de administrador');
        }
      }
      console.log('✅ Usuário confirmado como admin');

      // Verificar se o tema existe antes da exclusão
      const { data: existingTema, error: checkError } = await supabase
        .from('temas')
        .select('id, frase_tematica')
        .eq('id', id)
        .single();

      if (checkError) {
        console.error('❌ Erro ao verificar existência do tema:', checkError);
        throw new Error('Tema não encontrado ou erro ao verificar existência');
      }

      console.log('✅ Tema encontrado para exclusão:', existingTema.frase_tematica);

      // Executar a exclusão
      const { error: deleteError, data: deleteData } = await supabase
        .from('temas')
        .delete()
        .eq('id', id)
        .select();

      if (deleteError) {
        console.error('❌ Erro do Supabase ao excluir tema:', deleteError);
        throw new Error(`Erro na exclusão: ${deleteError.message}`);
      }

      console.log('✅ Resultado da exclusão:', deleteData);

      // Verificar se realmente foi excluído
      const { data: checkDeleted, error: verifyError } = await supabase
        .from('temas')
        .select('id')
        .eq('id', id)
        .maybeSingle();

      if (verifyError) {
        console.error('⚠️ Erro ao verificar exclusão:', verifyError);
      } else if (checkDeleted) {
        console.error('❌ CRÍTICO: Tema ainda existe após exclusão!', checkDeleted);
        throw new Error('Falha na exclusão - registro ainda existe no banco de dados');
      } else {
        console.log('✅ CONFIRMADO: Tema foi excluído permanentemente do banco');
      }

      // Invalidar queries e forçar refetch
      await queryClient.invalidateQueries({ queryKey: ['admin-temas'] });
      await queryClient.invalidateQueries({ queryKey: ['temas'] });
      await refetch();

      toast({
        title: "✅ Exclusão Confirmada",
        description: "O tema foi removido permanentemente do sistema.",
      });

    } catch (error: any) {
      console.error('💥 ERRO COMPLETO na exclusão:', error);
      toast({
        title: "❌ Falha na Exclusão",
        description: error.message || "Não foi possível excluir o tema. Verifique suas permissões.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return <div className="text-center py-4">Carregando temas...</div>;
  }

  if (editingId) {
    return (
      <TemaForm
        mode="edit"
        temaId={editingId}
        onCancel={() => setEditingId(null)}
        onSuccess={() => setEditingId(null)}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-redator-primary">Temas Cadastrados</h3>
      </div>

      {/* Alerta: temas sem imagem de capa */}
      {temasSemCapa.length > 0 && (
        <div className="border border-red-200 bg-red-50 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <ImageOff className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-red-700 mb-2">
                {temasSemCapa.length === 1
                  ? '1 tema sem imagem de capa'
                  : `${temasSemCapa.length} temas sem imagem de capa`}
              </p>
              <ul className="space-y-1.5">
                {temasSemCapa.map(t => (
                  <li key={t.id} className="flex items-center justify-between gap-2">
                    <span className="text-xs text-red-600 truncate">{t.frase_tematica}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-7 border-red-300 text-red-700 hover:bg-red-100 shrink-0"
                      onClick={() => setEditingId(t.id)}
                    >
                      Adicionar capa
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Seção de Filtros Admin */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <div className="flex-1">
            <AutocompleteInput
              value={fraseFilter}
              onValueChange={updateFraseFilter}
              suggestions={fraseSuggestions}
              placeholder="Filtrar por frase temática..."
              className="w-full"
            />
          </div>

          <div className="w-full sm:w-52">
            <Select value={statusFilter} onValueChange={updateStatusFilter}>
              <SelectTrigger className="bg-background border border-input">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-popover border border-border z-50">
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-full sm:w-52">
            <Select value={tipoFilter} onValueChange={updateTipoFilter}>
              <SelectTrigger className="bg-background border border-input">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent className="bg-popover border border-border z-50">
                {tipoOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-full sm:w-52">
            <Select value={orderBy} onValueChange={(value) => updateOrderBy(value as 'recente' | 'mais_redacoes')}>
              <SelectTrigger className="bg-background border border-input">
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent className="bg-popover border border-border z-50">
                <SelectItem value="recente">Mais recentes</SelectItem>
                <SelectItem value="mais_redacoes">Mais redações</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Indicador de filtros ativos e botão limpar */}
        {hasActiveFilters && (
          <div className="flex items-center justify-between bg-muted/50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>
                {temas?.length || 0} tema(s) encontrado(s)
                {fraseFilter && ` para "${fraseFilter}"`}
                {statusFilter && statusFilter !== 'todos' && ` com status "${statusOptions.find(s => s.value === statusFilter)?.label}"`}
                {tipoFilter && tipoFilter !== 'todos' && ` - ${tipoOptions.find(t => t.value === tipoFilter)?.label}`}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={clearFilters}
              className="text-sm"
            >
              <ClearIcon className="h-4 w-4 mr-2" />
              Limpar filtros
            </Button>
          </div>
        )}
      </div>
      
      {temas && temas.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {temas.map((tema) => (
            <TemaCardPadrao
              key={tema.id}
              tema={tema}
              perfil="admin"
              actions={{
                onEditar: (id) => setEditingId(id),
                onToggleStatus: (id, currentStatus) => toggleStatus(id, currentStatus),
                onExcluir: (id) => handleDelete(id)
              }}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-redator-accent">
            {hasActiveFilters 
              ? "Nenhum tema encontrado para os filtros aplicados." 
              : "Nenhum tema cadastrado ainda."
            }
          </p>
          {hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearFilters}
              className="mt-4"
            >
              <ClearIcon className="h-4 w-4 mr-2" />
              Limpar filtros
            </Button>
          )}
        </div>
      )}
    </div>
  );
};