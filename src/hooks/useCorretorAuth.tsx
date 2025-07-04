
import { useState, useEffect, createContext, useContext } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Corretor {
  id: string;
  nome_completo: string;
  email: string;
  ativo: boolean;
}

interface CorretorAuthContextType {
  corretor: Corretor | null;
  loading: boolean;
  loginAsCorretor: (email: string, senha: string) => Promise<{ error?: string }>;
  logout: () => void;
  isCorretor: boolean;
}

const CorretorAuthContext = createContext<CorretorAuthContextType>({
  corretor: null,
  loading: true,
  loginAsCorretor: async () => ({ error: "Not implemented" }),
  logout: () => {},
  isCorretor: false,
});

export const useCorretorAuth = () => {
  const context = useContext(CorretorAuthContext);
  if (!context) {
    throw new Error("useCorretorAuth must be used within CorretorAuthProvider");
  }
  return context;
};

export const CorretorAuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [corretor, setCorretor] = useState<Corretor | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Verificar se há um corretor logado no localStorage
    const savedCorretor = localStorage.getItem('corretor_session');
    if (savedCorretor) {
      try {
        const parsed = JSON.parse(savedCorretor);
        setCorretor(parsed);
      } catch (error) {
        localStorage.removeItem('corretor_session');
      }
    }
    setLoading(false);
  }, []);

  const loginAsCorretor = async (email: string, senha: string) => {
    try {
      // Verificar se o email é de um corretor ativo
      const { data: corretorData, error: corretorError } = await supabase
        .from("corretores")
        .select("*")
        .eq("email", email.toLowerCase().trim())
        .eq("ativo", true)
        .single();

      if (corretorError || !corretorData) {
        return { error: "Corretor não encontrado ou inativo" };
      }

      // Tentar fazer login com Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password: senha,
      });

      if (authError) {
        // Se não conseguir autenticar via Supabase, fazer login simples
        // (para corretores que não têm conta no auth)
        const corretorInfo: Corretor = {
          id: corretorData.id,
          nome_completo: corretorData.nome_completo,
          email: corretorData.email,
          ativo: corretorData.ativo,
        };

        setCorretor(corretorInfo);
        localStorage.setItem('corretor_session', JSON.stringify(corretorInfo));
        
        toast({
          title: "Login realizado com sucesso!",
          description: `Bem-vindo(a), ${corretorData.nome_completo}!`,
        });

        return {};
      }

      // Se autenticou via Supabase, usar dados do corretor
      const corretorInfo: Corretor = {
        id: corretorData.id,
        nome_completo: corretorData.nome_completo,
        email: corretorData.email,
        ativo: corretorData.ativo,
      };

      setCorretor(corretorInfo);
      localStorage.setItem('corretor_session', JSON.stringify(corretorInfo));
      
      toast({
        title: "Login realizado com sucesso!",
        description: `Bem-vindo(a), ${corretorData.nome_completo}!`,
      });

      return {};
    } catch (error: any) {
      console.error("Erro no login do corretor:", error);
      return { error: "Erro inesperado ao fazer login" };
    }
  };

  const logout = () => {
    setCorretor(null);
    localStorage.removeItem('corretor_session');
    supabase.auth.signOut();
    toast({
      title: "Logout realizado",
      description: "Até logo!",
    });
  };

  return (
    <CorretorAuthContext.Provider 
      value={{
        corretor,
        loading,
        loginAsCorretor,
        logout,
        isCorretor: !!corretor,
      }}
    >
      {children}
    </CorretorAuthContext.Provider>
  );
};
