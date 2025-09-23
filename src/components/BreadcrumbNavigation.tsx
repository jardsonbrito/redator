import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator 
} from '@/components/ui/breadcrumb';
import { useNavigationContext } from '@/hooks/useNavigationContext';
import { useCorretorNavigationContext } from '@/hooks/useCorretorNavigationContext';
import { useAdminNavigationContext } from '@/hooks/useAdminNavigationContext';
import { Home } from 'lucide-react';

interface BreadcrumbNavigationProps {
  className?: string;
  basePath?: string;
}

export const BreadcrumbNavigation: React.FC<BreadcrumbNavigationProps> = ({ className, basePath }) => {
  const location = useLocation();
  
  // Detectar contexto baseado na rota ou basePath
  const isCorretorPath = basePath === '/corretor' || location.pathname.startsWith('/corretor');
  const isAdminPath = basePath === '/admin' || location.pathname.startsWith('/admin');
  
  let breadcrumbs: Array<{ label: string; href?: string }> = [];
  
  try {
    if (isCorretorPath) {
      const corretorContext = useCorretorNavigationContext();
      breadcrumbs = corretorContext.breadcrumbs;
    } else if (isAdminPath) {
      const adminContext = useAdminNavigationContext();
      breadcrumbs = adminContext.breadcrumbs;
    } else {
      const studentContext = useNavigationContext();
      breadcrumbs = studentContext.breadcrumbs;
    }
  } catch (error) {
    // Se não há contexto disponível, não renderizar breadcrumbs
    return null;
  }

  // Se não há breadcrumbs ou só há um item, não renderizar
  if (!breadcrumbs.length || breadcrumbs.length === 1) {
    return null;
  }

  return (
    <div className={`bg-white/50 backdrop-blur-sm border-b px-4 py-3 ${className || ''}`}>
      <div className="max-w-7xl mx-auto">
        <Breadcrumb>
          <BreadcrumbList>
            {breadcrumbs.map((crumb, index) => {
              const isLast = index === breadcrumbs.length - 1;
              const isFirst = index === 0;

              return (
                <React.Fragment key={index}>
                  <BreadcrumbItem>
                    {isLast ? (
                      <BreadcrumbPage className="flex items-center gap-1.5">
                        {isFirst && <Home className="w-4 h-4" />}
                        {crumb.label}
                      </BreadcrumbPage>
                    ) : crumb.href ? (
                      <BreadcrumbLink asChild>
                        <Link
                          to={crumb.href}
                          className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {isFirst && <Home className="w-4 h-4" />}
                          {crumb.label}
                        </Link>
                      </BreadcrumbLink>
                    ) : (
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        {isFirst && <Home className="w-4 h-4" />}
                        {crumb.label}
                      </span>
                    )}
                  </BreadcrumbItem>
                  {!isLast && <BreadcrumbSeparator />}
                </React.Fragment>
              );
            })}
          </BreadcrumbList>
        </Breadcrumb>
      </div>
    </div>
  );
};