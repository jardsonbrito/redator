
import { useState, useEffect, createContext, useContext } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Corretor {
  id: string;
  nome_completo: string;
  email: string;
  ativo: boolean;
  turmas_autorizadas?: string[] | null;
  sexo?: string | null;
}

interface CorretorAuthContextType {
  corretor: Corretor | null;
  loading: boolean;
  loginAsCorretor: (email: string, senha?: string) => Promise<{ error?: string }>;
  logout: () => void;
  isCorretor: boolean;
  updateCorretorNome: (nome: string) => Promise<void>;
  updateCorretorSexo: (sexo: string | null) => Promise<void>;
}

const CorretorAuthContext = createContext<CorretorAuthContextType>({
  corretor: null,
  loading: true,
  loginAsCorretor: async () => ({ error: "Not implemented" }),
  logout: () => {},
  isCorretor: false,
  updateCorretorNome: async () => {},
  updateCorretorSexo: async () => {},
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
    const savedCorretor = localStorage.getItem('corretor_session');
    if (savedCorretor) {
      try {
        const parsed = JSON.parse(savedCorretor);
        setCorretor(parsed);
        setLoading(false);

        // Atualiza turmas_autorizadas e sexo do banco (sessão antiga pode não ter esses campos)
        if (parsed.id) {
          supabase
            .from('corretores')
            .select('turmas_autorizadas, sexo')
            .eq('id', parsed.id)
            .maybeSingle()
            .then(({ data }) => {
              if (data) {
                const updated = {
                  ...parsed,
                  turmas_autorizadas: (data.turmas_autorizadas as string[]) ?? null,
                  sexo: (data as any).sexo ?? null,
                };
                setCorretor(updated);
                localStorage.setItem('corretor_session', JSON.stringify(updated));
              }
            });
        }
      } catch {
        localStorage.removeItem('corretor_session');
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, []);

  const loginAsCorretor = async (email: string, senha?: string) => {
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

      const corretorInfo: Corretor = {
        id: corretorData.id,
        nome_completo: corretorData.nome_completo,
        email: corretorData.email,
        ativo: corretorData.ativo,
        turmas_autorizadas: (corretorData.turmas_autorizadas as string[]) ?? null,
        sexo: (corretorData as any).sexo ?? null,
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

  const updateCorretorNome = async (nome: string) => {
    if (!corretor) return;
    const { error } = await supabase
      .from('corretores')
      .update({ nome_completo: nome.trim() })
      .eq('id', corretor.id);
    if (error) throw error;
    const updated = { ...corretor, nome_completo: nome.trim() };
    setCorretor(updated);
    localStorage.setItem('corretor_session', JSON.stringify(updated));
  };

  const updateCorretorSexo = async (sexo: string | null) => {
    if (!corretor) return;
    const { error } = await supabase
      .from('corretores')
      .update({ sexo } as any)
      .eq('id', corretor.id);
    if (error) throw error;
    const updated = { ...corretor, sexo };
    setCorretor(updated);
    localStorage.setItem('corretor_session', JSON.stringify(updated));
  };

  const logout = () => {
    try {
      // Limpar estado local
      setCorretor(null);
      localStorage.removeItem('corretor_session');
      
      // Limpar sessão do Supabase também
      supabase.auth.signOut();
      
      toast({
        title: "Logout realizado",
        description: "Até logo!",
      });

      // Forçar redirecionamento imediato para a página de login
      window.location.replace('/login');

    } catch (error) {
      console.error("Erro no logout:", error);
      // Mesmo se der erro, forçar limpeza e redirecionamento
      setCorretor(null);
      localStorage.removeItem('corretor_session');
      window.location.replace('/login');
    }
  };

  return (
    <CorretorAuthContext.Provider 
      value={{
        corretor,
        loading,
        loginAsCorretor,
        logout,
        isCorretor: !!corretor,
        updateCorretorNome,
        updateCorretorSexo,
      }}
    >
      {children}
    </CorretorAuthContext.Provider>
  );
};
