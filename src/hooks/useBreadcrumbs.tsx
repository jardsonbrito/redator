import { useEffect } from 'react';
import { useNavigationContext, BreadcrumbItem } from './useNavigationContext';

/**
 * Hook para definir breadcrumbs customizados em uma página específica
 */
export const useBreadcrumbs = (breadcrumbs: BreadcrumbItem[]) => {
  const { setBreadcrumbs } = useNavigationContext();

  useEffect(() => {
    setBreadcrumbs(breadcrumbs);
  }, [setBreadcrumbs, breadcrumbs]);
};

/**
 * Hook para definir título da página
 */
export const usePageTitle = (title: string) => {
  const { setPageTitle } = useNavigationContext();

  useEffect(() => {
    setPageTitle(title);
    
    // Atualizar também o título do documento
    document.title = `${title} - Redator`;
    
    return () => {
      document.title = 'Redator';
    };
  }, [setPageTitle, title]);
};