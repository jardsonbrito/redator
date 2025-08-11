
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
    console.log('🔐 Tentando login para:', email);
    setLoading(true);
    
    try {
      // Primeiro: Tentar login via Supabase Auth
      console.log('📧 Etapa 1: Tentando Supabase Auth...');
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (!authError && authData.user) {
        console.log('✅ Supabase Auth successful para:', authData.user.email);
        // A sessão será definida pelo listener onAuthStateChange automaticamente
        return { error: null };
      }

      console.log('⚠️ Supabase Auth falhou:', authError?.message);
      console.log('🔄 Etapa 2: Tentando validação direta de admin...');
      
      // Segundo: Tentar validação direta para admins
      const { data: adminResponse, error: adminError } = await supabase.rpc('validate_admin_credentials', {
        p_email: email,
        p_password: password
      });
      
      console.log('🔍 Resposta da validação direta:', { adminResponse, adminError });
      
      const validationResult = adminResponse as unknown as AdminValidationResponse;
      
      if (!adminError && validationResult?.success && validationResult.admin) {
        console.log('✅ Validação direta de admin successful para:', email);
        console.log('👤 Admin info:', validationResult.admin);
        
        // Criar sessão administrativa personalizada
        const adminUser = {
          id: validationResult.admin.id,
          email: validationResult.admin.email,
          aud: 'authenticated',
          role: 'authenticated',
          email_confirmed_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          user_metadata: {
            nome_completo: validationResult.admin.nome_completo
          },
          app_metadata: {
            provider: 'admin_direct',
            providers: ['admin_direct']
          }
        } as any;
        
        const adminSession = {
          user: adminUser,
          access_token: `admin_session_${Date.now()}`,
          token_type: 'bearer',
          expires_in: 3600,
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          refresh_token: `admin_refresh_${Date.now()}`
        } as any;
        
        console.log('🎯 Criando sessão admin customizada');
        
        setSession(adminSession);
        setUser(adminUser);
        setIsAdmin(true);
        
        // Salvar sessão localmente
        localStorage.setItem('admin_session', JSON.stringify({
          email: adminUser.email,
          id: adminUser.id,
          nome_completo: validationResult.admin.nome_completo,
          timestamp: new Date().toISOString(),
          login_method: 'direct_validation'
        }));
        
        console.log('✅ Login direct admin completed successfully!');
        setLoading(false);
        return { error: null };
      }
      
      // Ambos os métodos falharam
      console.error('❌ Ambos os métodos falharam:');
      console.error('   - Supabase Auth:', authError?.message);
      console.error('   - Validação direta:', adminError?.message || 'validation failed');
      
      setLoading(false);
      return { 
        error: authError || adminError || new Error('Credenciais inválidas') 
      };
      
    } catch (error) {
      console.error('❌ Exceção durante login:', error);
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
