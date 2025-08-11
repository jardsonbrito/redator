import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AdminUser {
  id: string;
  email: string;
  nome_completo: string;
  ativo: boolean;
  criado_em: string;
  ultimo_login?: string;
}

interface RPCResponse {
  success: boolean;
  message: string;
  error?: string;
}

export const useAdminConfig = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const getCurrentAdmin = async (): Promise<AdminUser | null> => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user?.email) return null;

      const { data, error } = await supabase
        .from('admin_users')
        .select('*')
        .eq('email', user.user.email)
        .eq('ativo', true)
        .single();

      if (error) {
        console.error('Erro ao buscar admin atual:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Erro ao buscar admin atual:', error);
      return null;
    }
  };

  const updateAdminEmail = async (
    adminId: string, 
    newEmail: string, 
    currentPassword: string
  ) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('update_admin_email', {
        p_admin_id: adminId,
        p_new_email: newEmail,
        p_current_password: currentPassword
      });

      if (error) {
        throw error;
      }

      const result = data as unknown as RPCResponse;
      
      if (!result.success) {
        toast({
          title: "Erro",
          description: result.message,
          variant: "destructive",
        });
        return false;
      }

      toast({
        title: "Sucesso",
        description: result.message,
      });

      // Registrar log de alteração
      await logConfigChange(adminId, 'email_change', {
        old_email: 'hidden',
        new_email: newEmail
      });

      return true;
    } catch (error: any) {
      console.error('Erro ao atualizar email:', error);
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

  const updateAdminPassword = async (
    adminId: string,
    currentPassword: string,
    newPassword: string
  ) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('update_admin_password', {
        p_admin_id: adminId,
        p_current_password: currentPassword,
        p_new_password: newPassword
      });

      if (error) {
        throw error;
      }

      const result = data as unknown as RPCResponse;
      
      if (!result.success) {
        toast({
          title: "Erro",
          description: result.message,
          variant: "destructive",
        });
        return false;
      }

      toast({
        title: "Sucesso",
        description: result.message,
      });

      // Registrar log de alteração
      await logConfigChange(adminId, 'password_change', {
        changed_at: new Date().toISOString()
      });

      return true;
    } catch (error: any) {
      console.error('Erro ao atualizar senha:', error);
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

  const logConfigChange = async (
    adminId: string,
    action: string,
    details: any
  ) => {
    try {
      await supabase
        .from('admin_config_logs')
        .insert({
          admin_id: adminId,
          acao: action,
          detalhes: details
        });
    } catch (error) {
      console.error('Erro ao registrar log:', error);
    }
  };

  const getConfigLogs = async (adminId?: string) => {
    try {
      let query = supabase
        .from('admin_config_logs')
        .select(`
          *,
          admin_users!inner(email, nome_completo)
        `)
        .order('criado_em', { ascending: false })
        .limit(50);

      if (adminId) {
        query = query.eq('admin_id', adminId);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Erro ao buscar logs:', error);
      return [];
    }
  };

  return {
    loading,
    getCurrentAdmin,
    updateAdminEmail,
    updateAdminPassword,
    getConfigLogs
  };
};