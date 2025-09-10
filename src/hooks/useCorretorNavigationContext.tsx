import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface CorretorNavigationContextType {
  breadcrumbs: BreadcrumbItem[];
  setBreadcrumbs: (breadcrumbs: BreadcrumbItem[]) => void;
  pageTitle: string;
  setPageTitle: (title: string) => void;
}

const CorretorNavigationContext = createContext<CorretorNavigationContextType | undefined>(undefined);

interface CorretorNavigationProviderProps {
  children: ReactNode;
}

export const CorretorNavigationProvider: React.FC<CorretorNavigationProviderProps> = ({ children }) => {
  const [customBreadcrumbs, setCustomBreadcrumbs] = useState<BreadcrumbItem[]>([]);
  const [pageTitle, setPageTitle] = useState<string>('');
  const location = useLocation();

  // Mapear rotas automáticas para o corretor
  const getAutomaticBreadcrumbs = (pathname: string): BreadcrumbItem[] => {
    const segments = pathname.split('/').filter(Boolean);
    
    if (segments.length === 0 || segments[0] !== 'corretor') {
      return [];
    }

    const breadcrumbs: BreadcrumbItem[] = [
      { label: 'Dashboard', href: '/corretor' }
    ];

    // Mapear rotas conhecidas do corretor
    const routeMap: Record<string, string> = {
      'ajuda-rapida': 'Recado dos Alunos',
      'redacoes-corretor': 'Redações',
      'temas': 'Temas',
      'simulados': 'Simulados',
      'redacoes': 'Exemplares',
      'lousas': 'Lousas',
      'aulas': 'Aulas',
      'videoteca': 'Videoteca',
      'biblioteca': 'Biblioteca',
      'top5': 'Top 5'
    };

    for (let i = 1; i < segments.length; i++) {
      const segment = segments[i];
      const path = '/' + segments.slice(0, i + 1).join('/');
      
      // Verificar se é um UUID (páginas de detalhes)
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment);
      
      if (isUUID) {
        // Para UUIDs, não adicionar ao breadcrumb automático (será feito dinamicamente)
        break;
      }
      
      const label = routeMap[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);
      breadcrumbs.push({ label, href: path });
    }

    return breadcrumbs;
  };

  // Atualizar breadcrumbs quando a rota mudar
  useEffect(() => {
    if (customBreadcrumbs.length === 0) {
      // Usar breadcrumbs automáticos apenas se não houver customizados
      const automatic = getAutomaticBreadcrumbs(location.pathname);
      setCustomBreadcrumbs(automatic);
    }
  }, [location.pathname, customBreadcrumbs.length]);

  const setBreadcrumbs = (breadcrumbs: BreadcrumbItem[]) => {
    setCustomBreadcrumbs(breadcrumbs);
  };

  return (
    <CorretorNavigationContext.Provider
      value={{
        breadcrumbs: customBreadcrumbs,
        setBreadcrumbs,
        pageTitle,
        setPageTitle,
      }}
    >
      {children}
    </CorretorNavigationContext.Provider>
  );
};

export const useCorretorNavigationContext = (): CorretorNavigationContextType => {
  const context = useContext(CorretorNavigationContext);
  if (context === undefined) {
    throw new Error('useCorretorNavigationContext must be used within a CorretorNavigationProvider');
  }
  return context;
};

// Hook utilitário para páginas do corretor
export const useCorretorBreadcrumbs = (breadcrumbs: BreadcrumbItem[]) => {
  const { setBreadcrumbs } = useCorretorNavigationContext();
  
  useEffect(() => {
    setBreadcrumbs(breadcrumbs);
    
    // Limpar ao desmontar
    return () => setBreadcrumbs([]);
  }, [breadcrumbs, setBreadcrumbs]);
};

export const useCorretorPageTitle = (title: string) => {
  const { setPageTitle } = useCorretorNavigationContext();
  
  useEffect(() => {
    setPageTitle(title);
    document.title = `${title} | Corretor - Redator`;
    
    // Limpar ao desmontar
    return () => {
      setPageTitle('');
      document.title = 'Corretor - Redator';
    };
  }, [title, setPageTitle]);
};