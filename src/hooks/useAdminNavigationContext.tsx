import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface AdminNavigationContextType {
  breadcrumbs: BreadcrumbItem[];
  setBreadcrumbs: (breadcrumbs: BreadcrumbItem[]) => void;
  pageTitle: string;
  setPageTitle: (title: string) => void;
}

const AdminNavigationContext = createContext<AdminNavigationContextType | undefined>(undefined);

interface AdminNavigationProviderProps {
  children: ReactNode;
}

export const AdminNavigationProvider: React.FC<AdminNavigationProviderProps> = ({ children }) => {
  const [customBreadcrumbs, setCustomBreadcrumbs] = useState<BreadcrumbItem[]>([]);
  const [pageTitle, setPageTitle] = useState<string>('');
  const location = useLocation();

  // Mapear rotas automáticas para o admin
  const getAutomaticBreadcrumbs = (pathname: string): BreadcrumbItem[] => {
    const segments = pathname.split('/').filter(Boolean);
    
    if (segments.length === 0 || segments[0] !== 'admin') {
      return [];
    }

    const breadcrumbs: BreadcrumbItem[] = [
      { label: 'Dashboard', href: '/admin' }
    ];

    // Mapear rotas conhecidas do admin
    const routeMap: Record<string, string> = {
      'avisos': 'Avisos',
      'ajuda-rapida': 'Recado dos Alunos',
      'corretores': 'Corretores',
      'lousa-respostas': 'Respostas da Lousa',
      'exercicios': 'Exercícios',
      'exportacao': 'Exportação',
      'simulados': 'Simulados',
      'redacoes': 'Redações',
      'gamificacao': 'Gamificação',
      'visitantes': 'Visitantes',
      'alunos': 'Alunos',
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
    <AdminNavigationContext.Provider
      value={{
        breadcrumbs: customBreadcrumbs,
        setBreadcrumbs,
        pageTitle,
        setPageTitle,
      }}
    >
      {children}
    </AdminNavigationContext.Provider>
  );
};

export const useAdminNavigationContext = (): AdminNavigationContextType => {
  const context = useContext(AdminNavigationContext);
  if (context === undefined) {
    throw new Error('useAdminNavigationContext must be used within a AdminNavigationProvider');
  }
  return context;
};

// Hook utilitário para páginas do admin
export const useAdminBreadcrumbs = (breadcrumbs: BreadcrumbItem[]) => {
  const { setBreadcrumbs } = useAdminNavigationContext();
  
  useEffect(() => {
    setBreadcrumbs(breadcrumbs);
    
    // Limpar ao desmontar
    return () => setBreadcrumbs([]);
  }, [breadcrumbs, setBreadcrumbs]);
};

export const useAdminPageTitle = (title: string) => {
  const { setPageTitle } = useAdminNavigationContext();
  
  useEffect(() => {
    setPageTitle(title);
    document.title = `${title} | Admin - Redator`;
    
    // Limpar ao desmontar
    return () => {
      setPageTitle('');
      document.title = 'Admin - Redator';
    };
  }, [title, setPageTitle]);
};