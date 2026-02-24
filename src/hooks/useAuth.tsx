
import { useState, useEffect, createContext, useContext } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AdminValidationResponse {
  success: boolean;
  admin?: {
    id: string;
    email: string;
    nome_completo: string;
  };
  error?: string;
  message?: string;
}

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

  const checkAdminStatus = async (userEmail: string | undefined) => {
    if (!userEmail) {
      setIsAdmin(false);
      return false;
    }
    
    try {
      // Consultar tabela admin_users primeiro
      const { data, error } = await supabase
        .from('admin_users')
        .select('ativo')
        .eq('email', userEmail.toLowerCase())
        .eq('ativo', true)
        .single();
      
      if (!error && data) {
        console.log('🔐 Admin check (database) - Email:', userEmail, 'Status: active');
        setIsAdmin(true);
        return true;
      }
      
      // Fallback para emails hardcoded (compatibilidade)
      const adminEmails = ['jardsonbrito@gmail.com', 'jarvisluz@gmail.com'];
      const adminStatus = adminEmails.includes(userEmail.toLowerCase());
      console.log('🔐 Admin check (fallback) - Email:', userEmail, 'Status:', adminStatus);
      setIsAdmin(adminStatus);
      return adminStatus;
      
    } catch (error) {
      console.error('❌ Error checking admin status:', error);
      // Fallback para emails hardcoded em caso de erro
      const adminEmails = ['jardsonbrito@gmail.com', 'jarvisluz@gmail.com'];
      const adminStatus = adminEmails.includes(userEmail.toLowerCase());
      setIsAdmin(adminStatus);
      return adminStatus;
    }
  };

  useEffect(() => {
    let mounted = true;

    // Set up auth state listener (apenas para Supabase Auth — não interfere no admin direto)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, _session) => {
        // Admin usa sessão própria via localStorage; ignorar eventos do Supabase Auth
        if (mounted) setLoading(false);
      }
    );

    // Check for existing session
    const initializeAuth = async () => {
      try {
        // Restaurar sessão admin salva no localStorage
        const savedSession = localStorage.getItem('admin_session');
        if (savedSession) {
          try {
            const sessionData = JSON.parse(savedSession);
            const now = Math.floor(Date.now() / 1000);
            if (sessionData.expires_at && sessionData.expires_at > now) {
              const adminUser = {
                id: sessionData.id,
                email: sessionData.email,
                aud: 'authenticated',
                role: 'authenticated',
                email_confirmed_at: new Date().toISOString(),
                created_at: new Date().toISOString(),
                user_metadata: { nome_completo: sessionData.nome_completo },
                app_metadata: { provider: 'admin_direct' }
              } as any;
              if (mounted) {
                setUser(adminUser);
                setIsAdmin(true);
                setSession({ user: adminUser } as any);
              }
              return;
            } else {
              localStorage.removeItem('admin_session');
            }
          } catch {
            localStorage.removeItem('admin_session');
          }
        }

        if (mounted) {
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
    setLoading(true);
    try {
      const { data: adminResponse, error: adminError } = await supabase.rpc('validate_admin_credentials', {
        p_email: email,
        p_password: password
      });

      const validationResult = adminResponse as unknown as AdminValidationResponse;

      if (!adminError && validationResult?.success && validationResult.admin) {
        // Criar sessão real no Supabase Auth para que auth.email() funcione nas RLS policies
        const { data: authData, error: authSignInError } = await supabase.auth.signInWithPassword({
          email: email,
          password: password
        });

        if (authSignInError) {
          console.warn('⚠️ Supabase Auth signIn falhou:', authSignInError.message);
        }

        const adminUser = authData?.user ?? ({
          id: validationResult.admin.id,
          email: validationResult.admin.email,
          aud: 'authenticated',
          role: 'authenticated',
          email_confirmed_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          user_metadata: { nome_completo: validationResult.admin.nome_completo },
          app_metadata: { provider: 'admin_direct' }
        } as any);

        const adminSession = authData?.session ?? ({
          user: adminUser,
          access_token: `admin_session_${Date.now()}`,
          token_type: 'bearer',
          expires_in: 86400,
          expires_at: Math.floor(Date.now() / 1000) + 86400,
          refresh_token: `admin_refresh_${Date.now()}`
        } as any);

        setSession(adminSession);
        setUser(adminUser);
        setIsAdmin(true);

        localStorage.setItem('admin_session', JSON.stringify({
          email: validationResult.admin.email,
          id: validationResult.admin.id,
          nome_completo: validationResult.admin.nome_completo,
          expires_at: Math.floor(Date.now() / 1000) + 86400
        }));

        setLoading(false);
        return { error: null };
      }

      setLoading(false);
      return { error: adminError || new Error(validationResult?.message || 'Email ou senha inválidos') };
    } catch (error) {
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
      // Limpar cache do avatar
      localStorage.removeItem('student_avatar_url');
    } catch (error) {
      console.error('❌ Sign out error:', error);
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
