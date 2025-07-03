import { useState, useEffect, createContext, useContext } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AuthenticatedStudent {
  id: string;
  nome: string;
  sobrenome: string;
  email: string;
  turma: string;
  turma_codigo: string;
  is_authenticated_student: boolean;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  studentProfile: AuthenticatedStudent | null;
  loading: boolean;
  signUp: (email: string, password: string, userData: {
    nome: string;
    sobrenome: string;
    turma: string;
  }) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [studentProfile, setStudentProfile] = useState<AuthenticatedStudent | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Configurar listener de mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔐 Auth state changed:', event, session?.user?.email);
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Buscar perfil do aluno autenticado
          setTimeout(async () => {
            try {
              const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .eq('is_authenticated_student', true)
                .single();
              
              if (profile) {
                setStudentProfile(profile);
                console.log('✅ Perfil de aluno autenticado carregado:', profile.email);
              }
            } catch (error) {
              console.log('ℹ️ Usuário não é aluno autenticado ou erro ao carregar perfil');
            }
          }, 0);
        } else {
          setStudentProfile(null);
        }
        
        setLoading(false);
      }
    );

    // Verificar sessão existente
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, userData: {
    nome: string;
    sobrenome: string;
    turma: string;
  }) => {
    try {
      const turmaCode = getTurmaCode(userData.turma);
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            nome: userData.nome,
            sobrenome: userData.sobrenome,
            turma: userData.turma,
            turma_codigo: turmaCode,
            user_type: 'aluno_autenticado'
          }
        }
      });

      if (error) {
        console.error('❌ Erro no cadastro:', error);
        return { error };
      }

      console.log('✅ Cadastro realizado com sucesso:', data.user?.email);
      
      toast({
        title: "Cadastro realizado com sucesso!",
        description: "Verifique seu e-mail para confirmar a conta.",
      });

      return { error: null };
    } catch (error) {
      console.error('💥 Erro inesperado no cadastro:', error);
      return { error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('❌ Erro no login:', error);
        return { error };
      }

      console.log('✅ Login realizado com sucesso:', data.user?.email);
      
      toast({
        title: "Login realizado com sucesso!",
        description: "Bem-vindo de volta!",
      });

      return { error: null };
    } catch (error) {
      console.error('💥 Erro inesperado no login:', error);
      return { error };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      setStudentProfile(null);
      
      toast({
        title: "Logout realizado",
        description: "Você foi desconectado com segurança.",
      });
    } catch (error) {
      console.error('❌ Erro no logout:', error);
    }
  };

  const getTurmaCode = (turmaNome: string): string => {
    const turmasMap = {
      "Turma A": "LRA2025",
      "Turma B": "LRB2025", 
      "Turma C": "LRC2025",
      "Turma D": "LRD2025",
      "Turma E": "LRE2025"
    };
    return turmasMap[turmaNome as keyof typeof turmasMap] || turmaNome;
  };

  const value = {
    user,
    session,
    studentProfile,
    loading,
    signUp,
    signIn,
    signOut,
    isAuthenticated: !!user && !!studentProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useSupabaseAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useSupabaseAuth must be used within an AuthProvider');
  }
  return context;
}