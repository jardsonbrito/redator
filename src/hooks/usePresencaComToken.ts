import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface UsePresencaComTokenProps {
  sessionToken?: string | null;
}

export const usePresencaComToken = ({ sessionToken }: UsePresencaComTokenProps) => {
  const [loading, setLoading] = useState(false);

  // Função para obter token de sessão do cookie como fallback
  const getSessionToken = (): string | null => {
    if (sessionToken) return sessionToken;
    
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'student_session_token') {
        return value;
      }
    }
    return null;
  };

  const registrarEntrada = async (aulaId: string): Promise<boolean> => {
    const token = getSessionToken();
    
    if (!token) {
      toast.error('Sessão expirada. Faça login novamente.');
      return false;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('registrar_entrada_com_token', {
        p_aula_id: aulaId,
        p_session_token: token
      });

      if (error) {
        console.error('Erro ao registrar entrada:', error);
        toast.error('Erro ao registrar entrada');
        return false;
      }

      // Tratar diferentes respostas do backend
      switch (data) {
        case 'entrada_ok':
          toast.success('Entrada registrada com sucesso!');
          return true;
        case 'entrada_ja_registrada':
          toast.info('Entrada já foi registrada anteriormente');
          return true;
        case 'token_invalido_ou_expirado':
          toast.error('Sessão expirada. Faça login novamente.');
          return false;
        case 'aula_nao_encontrada':
          toast.error('Aula não encontrada');
          return false;
        case 'aula_nao_iniciou':
          toast.error('Aula ainda não iniciou (tolerância de 10 minutos antes)');
          return false;
        case 'janela_encerrada':
          toast.error('Janela de registro encerrada (30 minutos após o fim da aula)');
          return false;
        default:
          toast.error('Erro inesperado ao registrar entrada');
          return false;
      }
    } catch (error: any) {
      console.error('Erro ao registrar entrada:', error);
      toast.error('Erro ao registrar entrada');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const registrarSaida = async (aulaId: string): Promise<boolean> => {
    const token = getSessionToken();
    
    if (!token) {
      toast.error('Sessão expirada. Faça login novamente.');
      return false;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('registrar_saida_com_token', {
        p_aula_id: aulaId,
        p_session_token: token
      });

      if (error) {
        console.error('Erro ao registrar saída:', error);
        toast.error('Erro ao registrar saída');
        return false;
      }

      // Tratar diferentes respostas do backend
      switch (data) {
        case 'saida_ok':
          toast.success('Saída registrada com sucesso!');
          return true;
        case 'saida_ja_registrada':
          toast.info('Saída já foi registrada anteriormente');
          return true;
        case 'token_invalido_ou_expirado':
          toast.error('Sessão expirada. Faça login novamente.');
          return false;
        case 'aula_nao_encontrada':
          toast.error('Aula não encontrada');
          return false;
        case 'aula_nao_iniciou':
          toast.error('Aula ainda não iniciou');
          return false;
        case 'janela_encerrada':
          toast.error('Janela de registro encerrada (30 minutos após o fim da aula)');
          return false;
        case 'precisa_entrada':
          toast.error('Registre a entrada primeiro');
          return false;
        default:
          toast.error('Erro inesperado ao registrar saída');
          return false;
      }
    } catch (error: any) {
      console.error('Erro ao registrar saída:', error);
      toast.error('Erro ao registrar saída');
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    registrarEntrada,
    registrarSaida,
    loading
  };
};