import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ReactNode;
}

interface NavigationContextType {
  breadcrumbs: BreadcrumbItem[];
  setBreadcrumbs: (breadcrumbs: BreadcrumbItem[]) => void;
  addBreadcrumb: (item: BreadcrumbItem) => void;
  popBreadcrumb: () => void;
  clearBreadcrumbs: () => void;
  setPageTitle: (title: string) => void;
  pageTitle: string;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export const useNavigationContext = () => {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigationContext must be used within a NavigationProvider');
  }
  return context;
};

interface NavigationProviderProps {
  children: React.ReactNode;
}

export const NavigationProvider: React.FC<NavigationProviderProps> = ({ children }) => {
  const [breadcrumbs, setBreadcrumbsState] = useState<BreadcrumbItem[]>([]);
  const [pageTitle, setPageTitle] = useState<string>('');
  const [hasCustomBreadcrumbs, setHasCustomBreadcrumbs] = useState<boolean>(false);
  const location = useLocation();

  // Mapear rotas para breadcrumbs automáticos
  const getAutomaticBreadcrumbs = useCallback((pathname: string): BreadcrumbItem[] => {
    const pathParts = pathname.split('/').filter(Boolean);
    const crumbs: BreadcrumbItem[] = [{ label: 'Início', href: '/app' }];

    // Mapeamento de rotas para labels
    const routeLabels: Record<string, string> = {
      'exercicios': 'Exercícios',
      'simulados': 'Simulados',
      'temas': 'Temas',
      'aulas': 'Aulas',
      'aulas-ao-vivo': 'Aulas ao Vivo',
      'videoteca': 'Videoteca',
      'biblioteca': 'Biblioteca',
      'redacoes': 'Redações Exemplar',
      'top5': 'TOP 5',
      'minhas-redacoes': 'Minhas Redações',
      'minhas-conquistas': 'Minhas Conquistas',
      'gamificacao': 'Gamificação',
      'lousa': 'Lousa Interativa',
      'ajuda-rapida': 'Ajuda Rápida',
      'salas-virtuais': 'Salas Virtuais',
      'envie-redacao': 'Enviar Redação',
      'manuscrita': 'Manuscrita'
    };

    let currentPath = '';
    
    for (let i = 0; i < pathParts.length; i++) {
      const part = pathParts[i];
      currentPath += `/${part}`;
      
      // Pular se for 'app' (já incluído como Início)
      if (part === 'app') continue;
      
      // Se for ID (UUID ou número), usar contexto da parte anterior
      if ((/^[0-9]+$/.test(part) || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(part)) && i > 0) {
        const previousPart = pathParts[i - 1];
        if (previousPart === 'temas') {
          crumbs.push({ label: 'Detalhes do Tema' });
        } else if (previousPart === 'simulado' || previousPart === 'simulados') {
          crumbs.push({ label: 'Participar do Simulado' });
        } else if (previousPart === 'lousa') {
          crumbs.push({ label: 'Responder Lousa' });
        } else if (previousPart === 'manuscrita') {
          crumbs.push({ label: 'Detalhes da Redação' });
        } else {
          crumbs.push({ label: 'Detalhes' });
        }
      } else {
        const label = routeLabels[part] || part.charAt(0).toUpperCase() + part.slice(1);
        
        // Se não é a última parte, adicionar link
        if (i < pathParts.length - 1) {
          crumbs.push({ label, href: currentPath });
        } else {
          crumbs.push({ label });
        }
      }
    }

    return crumbs;
  }, []);

  // Atualizar breadcrumbs automaticamente quando a rota mudar (apenas se não há customizados)
  useEffect(() => {
    if (!hasCustomBreadcrumbs) {
      const automaticBreadcrumbs = getAutomaticBreadcrumbs(location.pathname);
      setBreadcrumbsState(automaticBreadcrumbs);
    }
  }, [location.pathname, getAutomaticBreadcrumbs, hasCustomBreadcrumbs]);

  // Reset custom breadcrumbs flag when location changes
  useEffect(() => {
    setHasCustomBreadcrumbs(false);
  }, [location.pathname]);

  const setBreadcrumbs = useCallback((newBreadcrumbs: BreadcrumbItem[]) => {
    setBreadcrumbsState(newBreadcrumbs);
    setHasCustomBreadcrumbs(true);
  }, []);

  const addBreadcrumb = useCallback((item: BreadcrumbItem) => {
    setBreadcrumbsState(prev => [...prev, item]);
  }, []);

  const popBreadcrumb = useCallback(() => {
    setBreadcrumbsState(prev => prev.slice(0, -1));
  }, []);

  const clearBreadcrumbs = useCallback(() => {
    setBreadcrumbsState([]);
  }, []);

  return (
    <NavigationContext.Provider
      value={{
        breadcrumbs,
        setBreadcrumbs,
        addBreadcrumb,
        popBreadcrumb,
        clearBreadcrumbs,
        setPageTitle,
        pageTitle
      }}
    >
      {children}
    </NavigationContext.Provider>
  );
};