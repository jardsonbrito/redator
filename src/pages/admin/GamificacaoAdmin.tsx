import { useAuth } from "@/hooks/useAuth";
import { Navigate, Link } from "react-router-dom";
import { Home } from "lucide-react";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import GamificationAdmin from "@/components/admin/GamificationAdmin";

const GamificacaoAdmin = () => {
  const { user, isAdmin } = useAuth();

  if (!user || !isAdmin) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary/20 via-secondary/10 to-secondary/5">
      {/* Header exatamente igual ao painel administrativo */}
      <header className="bg-white/90 backdrop-blur-sm shadow-lg border-b border-primary/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Link to="/app" className="flex items-center gap-2 bg-primary/10 hover:bg-primary/20 px-3 py-2 rounded-lg transition-all duration-300 text-primary hover:text-primary font-medium">
                <Home className="w-5 h-5" />
                <span>Voltar ao App</span>
              </Link>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  Painel Administrativo
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="bg-primary/5 backdrop-blur-sm px-4 py-2 rounded-full border border-primary/10">
                <span className="text-sm text-muted-foreground">Olá, </span>
                <span className="text-sm font-medium text-primary">{user?.email}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Conteúdo principal */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/admin" className="text-primary font-medium">
                Dashboard
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="text-foreground">Gamificação</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Gamificação</h1>
              <p className="text-muted-foreground mt-1">Gerenciar jogos educacionais e atividades gamificadas</p>
            </div>
          </div>

          <GamificationAdmin />
        </div>
      </main>
    </div>
  );
};

export default GamificacaoAdmin;