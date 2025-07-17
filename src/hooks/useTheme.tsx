import { useState, useEffect, createContext, useContext } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setThemeState] = useState<Theme>('light');
  
  // Usar useAuth de forma segura
  let user = null;
  try {
    const authContext = useAuth();
    user = authContext?.user;
  } catch (error) {
    // useAuth não está disponível ainda, usar apenas localStorage
    console.log('AuthProvider not available yet, using localStorage only');
  }

  useEffect(() => {
    // Carregar tema inicial
    const initializeTheme = async () => {
      if (user) {
        try {
          // Carregar tema do banco de dados para usuários autenticados
          const { data } = await supabase
            .from('profiles')
            .select('theme_preference')
            .eq('id', user.id)
            .single();
          
          if (data?.theme_preference) {
            setThemeState(data.theme_preference as Theme);
          }
        } catch (error) {
          console.log('Error loading theme from database:', error);
        }
      } else {
        // Carregar tema do localStorage para usuários simples
        const savedTheme = localStorage.getItem('theme') as Theme;
        if (savedTheme) {
          setThemeState(savedTheme);
        }
      }
    };

    initializeTheme();
  }, [user]);

  useEffect(() => {
    // Aplicar tema no documento
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
  }, [theme]);

  const setTheme = async (newTheme: Theme) => {
    setThemeState(newTheme);
    
    if (user) {
      try {
        // Salvar no banco de dados para usuários autenticados
        await supabase
          .from('profiles')
          .update({ theme_preference: newTheme })
          .eq('id', user.id);
      } catch (error) {
        console.log('Error saving theme to database:', error);
      }
    } else {
      // Salvar no localStorage para usuários simples
      localStorage.setItem('theme', newTheme);
    }
  };

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};