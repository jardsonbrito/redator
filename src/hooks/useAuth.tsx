
import { useState, useEffect, createContext, useContext } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const checkAdminStatus = (userEmail: string | undefined) => {
    if (!userEmail) {
      setIsAdmin(false);
      return false;
    }
    
    const adminStatus = userEmail === 'jardsonbrito@gmail.com';
    console.log('🔐 Admin check - Email:', userEmail, 'Admin status:', adminStatus);
    setIsAdmin(adminStatus);
    return adminStatus;
  };

  useEffect(() => {
    let mounted = true;

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        console.log('🔄 Auth state changed:', event, 'User:', session?.user?.email);
        
        if (session?.user) {
          setSession(session);
          setUser(session.user);
          checkAdminStatus(session.user.email);
          
          // Salvar sessão admin persistente se for admin
          if (session.user.email === 'jardsonbrito@gmail.com') {
            localStorage.setItem('admin_session', JSON.stringify({
              email: session.user.email,
              timestamp: new Date().toISOString()
            }));
          }
        } else {
          setSession(null);
          setUser(null);
          setIsAdmin(false);
          // Limpar sessão admin
          localStorage.removeItem('admin_session');
        }
        
        setLoading(false);
      }
    );

    // Check for existing session
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (!mounted) return;

        if (error) {
          console.error('❌ Error getting session:', error);
          // Verificar se há sessão admin salva localmente como fallback
          const adminSession = localStorage.getItem('admin_session');
          if (adminSession) {
            try {
              const adminData = JSON.parse(adminSession);
              console.log('🔄 Tentando restaurar sessão admin local:', adminData.email);
              // Tentar reautenticar silenciosamente se necessário
            } catch (e) {
              localStorage.removeItem('admin_session');
            }
          }
          setLoading(false);
          return;
        }

        console.log('✅ Initial session check:', session?.user?.email);
        
        if (session?.user) {
          setSession(session);
          setUser(session.user);
          checkAdminStatus(session.user.email);
        } else {
          // Verificar sessão local salva
          const adminSession = localStorage.getItem('admin_session');
          if (adminSession) {
            console.log('🔄 Sessão local encontrada, tentando restaurar...');
          }
          setSession(null);
          setUser(null);
          setIsAdmin(false);
        }
      } catch (error) {
        console.error('❌ Error initializing auth:', error);
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

  const signIn = async (email: string, password: string) => {
    console.log('🔐 Attempting sign in with:', email);
    setLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        console.error('❌ Sign in error:', error);
        setLoading(false);
        return { error };
      }

      if (data.user) {
        console.log('✅ Sign in successful for:', data.user.email);
        // A sessão será definida pelo listener onAuthStateChange
        return { error: null };
      }
      
      setLoading(false);
      return { error: new Error('Login failed - no user returned') };
    } catch (error) {
      console.error('❌ Sign in exception:', error);
      setLoading(false);
      return { error };
    }
  };

  const signOut = async () => {
    console.log('🚪 Signing out...');
    setLoading(true);
    
    try {
      await supabase.auth.signOut();
      setSession(null);
      setUser(null);
      setIsAdmin(false);
      // Limpar sessão admin local
      localStorage.removeItem('admin_session');
      
      // Forçar redirecionamento para tela principal de login
      window.location.replace('/');
    } catch (error) {
      console.error('❌ Sign out error:', error);
      // Mesmo se der erro, forçar redirecionamento
      window.location.replace('/');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      signIn,
      signOut,
      isAdmin
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
