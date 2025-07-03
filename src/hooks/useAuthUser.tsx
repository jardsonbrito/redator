import { useState, useEffect, createContext, useContext } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface Profile {
  id: string;
  nome: string;
  sobrenome: string;
  email: string;
  user_type: string;
  turma: string;
  created_at: string;
  updated_at: string;
}

interface AuthUserContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthUserContext = createContext<AuthUserContextType | undefined>(undefined);

export const AuthUserProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Erro ao buscar perfil:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Erro ao buscar perfil:', error);
      return null;
    }
  };

  useEffect(() => {
    let mounted = true;

    // Configurar listener de mudanças de auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        console.log('Auth state changed:', event, 'User:', session?.user?.email);
        
        if (session?.user) {
          setSession(session);
          setUser(session.user);
          
          // Buscar perfil do usuário
          const userProfile = await fetchProfile(session.user.id);
          if (mounted) {
            setProfile(userProfile);
          }
        } else {
          setSession(null);
          setUser(null);
          setProfile(null);
        }
        
        if (mounted) {
          setLoading(false);
        }
      }
    );

    // Verificar sessão existente
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (!mounted) return;

        if (error) {
          console.error('Erro ao obter sessão:', error);
          setLoading(false);
          return;
        }

        console.log('Sessão inicial:', session?.user?.email);
        
        if (session?.user) {
          setSession(session);
          setUser(session.user);
          
          // Buscar perfil do usuário
          const userProfile = await fetchProfile(session.user.id);
          if (mounted) {
            setProfile(userProfile);
          }
        } else {
          setSession(null);
          setUser(null);
          setProfile(null);
        }
      } catch (error) {
        console.error('Erro ao inicializar auth:', error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    console.log('Fazendo logout...');
    setLoading(true);
    
    try {
      await supabase.auth.signOut();
      setSession(null);
      setUser(null);
      setProfile(null);
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    } finally {
      setLoading(false);
    }
  };

  const isAuthenticated = !!(session && user && profile);

  return (
    <AuthUserContext.Provider value={{
      user,
      session,
      profile,
      loading,
      signOut,
      isAuthenticated
    }}>
      {children}
    </AuthUserContext.Provider>
  );
};

export const useAuthUser = () => {
  const context = useContext(AuthUserContext);
  if (context === undefined) {
    throw new Error('useAuthUser must be used within an AuthUserProvider');
  }
  return context;
};