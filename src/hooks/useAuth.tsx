
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

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        console.log('🔄 Auth state changed:', event, 'User:', session?.user?.email);
        
        if (session?.user) {
          setSession(session);
          setUser(session.user);
          
          // Verificar status admin de forma assíncrona
          setTimeout(async () => {
            const isAdminUser = await checkAdminStatus(session.user.email);
            if (isAdminUser) {
              localStorage.setItem('admin_session', JSON.stringify({
                email: session.user.email,
                timestamp: new Date().toISOString()
              }));
            }
          }, 0);
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
          
          // Verificar status admin de forma assíncrona  
          setTimeout(async () => {
            await checkAdminStatus(session.user.email);
          }, 0);
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
      // Tentar login via Supabase Auth primeiro
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (!error && data.user) {
        console.log('✅ Supabase Auth sign in successful for:', data.user.email);
        // A sessão será definida pelo listener onAuthStateChange
        return { error: null };
      }

      // Se falhou no Supabase Auth, tentar login direto para admins
      console.log('🔄 Trying direct admin validation for:', email);
      
      const { data: adminData, error: adminError } = await supabase.rpc('validate_admin_credentials', {
        p_email: email,
        p_password: password
      });
      
      const validationResult = adminData as unknown as AdminValidationResponse;
      
      if (!adminError && validationResult?.success && validationResult.admin) {
        console.log('✅ Direct admin login successful for:', email);
        
        // Criar sessão administrativa personalizada
        const adminUser = {
          id: validationResult.admin.id,
          email: validationResult.admin.email,
          aud: 'authenticated',
          role: 'authenticated',
          created_at: new Date().toISOString(),
          user_metadata: {
            nome_completo: validationResult.admin.nome_completo
          }
        } as any;
        
        const adminSession = {
          user: adminUser,
          access_token: `admin_session_${Date.now()}`,
          token_type: 'bearer',
          expires_in: 3600,
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          refresh_token: `refresh_${Date.now()}`
        } as any;
        
        setSession(adminSession);
        setUser(adminUser);
        setIsAdmin(true);
        
        localStorage.setItem('admin_session', JSON.stringify({
          email: adminUser.email,
          timestamp: new Date().toISOString()
        }));
        
        setLoading(false);
        return { error: null };
      }
      
      // Se ambos falharam
      console.error('❌ Both auth methods failed:', { supabaseError: error, adminError });
      setLoading(false);
      return { error: error || new Error('Credenciais inválidas') };
      
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
