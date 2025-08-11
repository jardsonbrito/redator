import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AdminUser {
  id: string;
  nome_completo: string;
  email: string;
  ativo: boolean;
  criado_em: string;
  ultimo_login?: string;
  criado_por_nome?: string;
}

interface CreateAdminData {
  nome_completo: string;
  email: string;
  password: string;
}

export const useAdminManagement = () => {
  const [loading, setLoading] = useState(false);
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const { toast } = useToast();

  const createAdmin = async (data: CreateAdminData) => {
    setLoading(true);
    try {
      const { data: result, error } = await supabase.rpc('create_admin_user', {
        p_nome_completo: data.nome_completo,
        p_email: data.email,
        p_password: data.password
      });

      if (error) throw error;

      const response = result as any;
      if (!response?.success) {
        toast({
          title: "Erro",
          description: response?.message || "Erro desconhecido",
          variant: "destructive",
        });
        return false;
      }

      toast({
        title: "Sucesso",
        description: response.message,
      });

      // Reload the admin list
      await loadAdmins();
      return true;
    } catch (error: any) {
      console.error('Erro ao criar administrador:', error);
      toast({
        title: "Erro",
        description: "Erro interno do sistema. Tente novamente.",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const loadAdmins = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('list_admin_users');

      if (error) throw error;

      setAdmins(data || []);
    } catch (error) {
      console.error('Erro ao carregar administradores:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar lista de administradores.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleAdminStatus = async (adminId: string, newStatus: boolean) => {
    setLoading(true);
    try {
      const { data: result, error } = await supabase.rpc('toggle_admin_status', {
        p_admin_id: adminId,
        p_new_status: newStatus
      });

      if (error) throw error;

      const response = result as any;
      if (!response?.success) {
        toast({
          title: "Erro",
          description: response?.message || "Erro desconhecido",
          variant: "destructive",
        });
        return false;
      }

      toast({
        title: "Sucesso",
        description: response.message,
      });

      // Reload the admin list
      await loadAdmins();
      return true;
    } catch (error: any) {
      console.error('Erro ao alterar status do administrador:', error);
      toast({
        title: "Erro",
        description: "Erro interno do sistema. Tente novamente.",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    admins,
    createAdmin,
    loadAdmins,
    toggleAdminStatus
  };
};