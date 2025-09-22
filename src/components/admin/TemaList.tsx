import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { X as ClearIcon } from 'lucide-react';
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
    isLoading,
    error,
    fraseFilter,
    statusFilter,
    statusOptions,
    fraseSuggestions,
    hasActiveFilters,
    updateFraseFilter,
    updateStatusFilter,
    clearFilters,
  } = useAdminTemasFilters();

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
      
      // Verificar autenticação do usuário
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('Usuário não autenticado');
      }
      console.log('✅ Usuário autenticado:', user.email);

      // Verificar se é admin com query corrigida
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('user_type')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('❌ Erro ao verificar perfil:', profileError);
        throw new Error('Erro ao verificar permissões do usuário');
      }

      if (!profile || profile.user_type !== 'admin') {
        throw new Error('Usuário não tem permissões de administrador');
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
          
          <div className="w-full sm:w-64">
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
        </div>

        {/* Indicador de filtros ativos e botão limpar */}
        {hasActiveFilters && (
          <div className="flex items-center justify-between bg-muted/50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>
                {temas?.length || 0} tema(s) encontrado(s)
                {fraseFilter && ` para "${fraseFilter}"`}
                {statusFilter && statusFilter !== 'todos' && ` com status "${statusOptions.find(s => s.value === statusFilter)?.label}"`}
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