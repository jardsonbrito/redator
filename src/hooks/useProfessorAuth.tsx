import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Professor {
  id: string;
  nome_completo: string;
  email: string;
  role: string;
  primeiro_login: boolean;
}

interface ProfessorAuthContextType {
  professor: Professor | null;
  loading: boolean;
  loginAsProfessor: (email: string, senha: string) => Promise<{ error?: string }>;
  logout: () => void;
  isProfessor: boolean;
  isAdmin: boolean;
  trocarSenha: (novaSenha: string) => Promise<{ error?: string }>;
}

const ProfessorAuthContext = createContext<ProfessorAuthContextType | undefined>(undefined);

export const useProfessorAuth = () => {
  const context = useContext(ProfessorAuthContext);
  if (context === undefined) {
    throw new Error('useProfessorAuth must be used within a ProfessorAuthProvider');
  }
  return context;
};

interface ProfessorAuthProviderProps {
  children: ReactNode;
}

export const ProfessorAuthProvider = ({ children }: ProfessorAuthProviderProps) => {
  const [professor, setProfessor] = useState<Professor | null>(null);
  const [loading, setLoading] = useState(true);

  // Verificar se há sessão salva
  useEffect(() => {
    const savedProfessorSession = localStorage.getItem('professor_session');
    if (savedProfessorSession) {
      try {
        const professorData = JSON.parse(savedProfessorSession);
        setProfessor(professorData);
      } catch (error) {
        console.error('Erro ao recuperar sessão do professor:', error);
        localStorage.removeItem('professor_session');
      }
    }
    setLoading(false);
  }, []);

  const loginAsProfessor = async (email: string, senha: string): Promise<{ error?: string }> => {
    setLoading(true);
    
    try {
      // Chamar função de validação de login
      const { data, error } = await supabase.rpc('validate_professor_login', {
        p_email: email,
        p_senha: senha
      });

      if (error) {
        console.error('Erro na função de login:', error);
        return { error: 'Erro interno. Tente novamente.' };
      }

      const result = data as any;
      if (!result.success) {
        return { error: result.message || 'Credenciais inválidas' };
      }

      const professorData = result.professor;
      setProfessor(professorData);
      
      // Salvar sessão no localStorage
      localStorage.setItem('professor_session', JSON.stringify(professorData));
      
      return {};
    } catch (error: any) {
      console.error('Erro no login do professor:', error);
      return { error: 'Erro interno. Tente novamente.' };
    } finally {
      setLoading(false);
    }
  };

  const trocarSenha = async (novaSenha: string): Promise<{ error?: string }> => {
    if (!professor) {
      return { error: 'Nenhum professor logado' };
    }

    try {
      const { data, error } = await supabase.rpc('trocar_senha_professor', {
        professor_id: professor.id,
        nova_senha: novaSenha
      });

      if (error) {
        console.error('Erro ao trocar senha:', error);
        return { error: 'Erro interno. Tente novamente.' };
      }

      const result = data as any;
      if (!result.success) {
        return { error: result.message || 'Erro ao trocar senha' };
      }

      // Atualizar dados do professor local
      const updatedProfessor = { ...professor, primeiro_login: false };
      setProfessor(updatedProfessor);
      localStorage.setItem('professor_session', JSON.stringify(updatedProfessor));

      return {};
    } catch (error: any) {
      console.error('Erro ao trocar senha:', error);
      return { error: 'Erro interno. Tente novamente.' };
    }
  };

  const logout = (): void => {
    setProfessor(null);
    localStorage.removeItem('professor_session');
    
    // Fazer logout do Supabase também
    supabase.auth.signOut();
    
    // Redirecionar para a página de login
    window.location.href = '/professor/login';
  };

  const isProfessor = professor?.role === 'professor';
  const isAdmin = professor?.role === 'admin';

  const value: ProfessorAuthContextType = {
    professor,
    loading,
    loginAsProfessor,
    logout,
    isProfessor,
    isAdmin,
    trocarSenha
  };

  return (
    <ProfessorAuthContext.Provider value={value}>
      {children}
    </ProfessorAuthContext.Provider>
  );
};