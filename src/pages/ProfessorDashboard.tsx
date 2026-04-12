import { useProfessorAuth } from "@/hooks/useProfessorAuth";
import { Navigate, Link } from "react-router-dom";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen,
  BookMarked,
  FileText,
  Video,
  MessageSquare,
  Library,
  LogOut,
  GraduationCap,
  Lightbulb,
  Layers,
  Bot,
  Map,
  PlayCircle,
} from "lucide-react";
import { ProfessorAvatar } from "@/components/professor/ProfessorAvatar";

type Origem = "herdado" | "exclusivo" | "filtrado" | "em-breve";

interface MenuItem {
  id: string;
  label: string;
  icon: React.ElementType;
  path: string | null; // null = não implementado ainda
  origem: Origem;
}

const origemConfig: Record<Origem, { label: string; className: string }> = {
  herdado:   { label: "Herdado do app",       className: "bg-gray-100 text-gray-500" },
  exclusivo: { label: "Exclusivo professor",   className: "bg-violet-100 text-violet-600" },
  filtrado:  { label: "Filtrado",              className: "bg-blue-100 text-blue-600" },
  "em-breve":{ label: "Em breve",              className: "bg-orange-100 text-orange-500" },
};

const menuItems: MenuItem[] = [
  { id: "temas",              label: "Temas",                icon: Lightbulb,   path: "/professor/temas",          origem: "herdado"   },
  { id: "guia-tematico",      label: "Guia Temático",        icon: Map,         path: "/professor/guia-tematico",  origem: "herdado"   },
  { id: "repertorio",         label: "Repertório Orientado", icon: BookMarked,  path: "/professor/repertorio",     origem: "herdado"   },
  { id: "redacoes-exemplares",label: "Redações Exemplares",  icon: FileText,    path: "/professor/redacoes",       origem: "herdado"   },
  { id: "redacoes-comentadas",label: "Redações Comentadas",  icon: MessageSquare,path: null,                       origem: "exclusivo" },
  { id: "aulas-gravadas",     label: "Aulas Gravadas",       icon: PlayCircle,  path: "/professor/aulas",          origem: "herdado"   },
  { id: "aulas-ao-vivo",      label: "Aulas ao Vivo",        icon: Video,       path: "/professor/salas-virtuais", origem: "herdado"   },
  { id: "biblioteca",         label: "Biblioteca",           icon: Library,     path: "/professor/biblioteca",     origem: "herdado"   },
  { id: "microaprendizagem",  label: "Microaprendizagem",    icon: Layers,      path: null,                        origem: "filtrado"  },
  { id: "jarvis",             label: "Jarvis",               icon: Bot,         path: null,                        origem: "em-breve"  },
];

export const ProfessorDashboard = () => {
  const { professor, logout } = useProfessorAuth();

  if (!professor) return <Navigate to="/professor/login" replace />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-sm shadow-lg border-b border-primary/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors">
              <GraduationCap className="w-5 h-5" />
              <span className="hidden sm:inline">Voltar à Web</span>
            </Link>

            <h1 className="text-lg font-semibold text-primary">Área do Professor</h1>

            <div className="flex items-center gap-3">
              <ProfessorAvatar size="sm" showUpload={true} />
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-foreground font-medium text-sm">
                  {professor.nome_completo || "Professor"}
                </span>
                <span className="text-muted-foreground text-xs">Professor</span>
              </div>
              <Button
                onClick={logout}
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-red-500"
                aria-label="Sair"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline ml-1">Sair</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Conteúdo */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {menuItems.map((item) => {
            const cfg = origemConfig[item.origem];
            const CardWrapper = item.path
              ? ({ children }: { children: React.ReactNode }) => (
                  <Link to={item.path!}>{children}</Link>
                )
              : ({ children }: { children: React.ReactNode }) => (
                  <div className="cursor-not-allowed opacity-60">{children}</div>
                );

            return (
              <CardWrapper key={item.id}>
                <Card className="group h-full bg-white/80 border border-primary/10 hover:shadow-xl hover:bg-white hover:border-primary/20 transition-all duration-300 rounded-2xl overflow-hidden">
                  <CardHeader className="p-6 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="p-4 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 group-hover:from-primary/20 group-hover:to-accent/20 transition-all duration-300">
                        <item.icon className="w-8 h-8 text-primary group-hover:text-accent transition-colors duration-300" />
                      </div>
                      <CardTitle className="text-lg font-semibold text-primary group-hover:text-accent transition-colors duration-300">
                        {item.label}
                      </CardTitle>
                      <Badge className={`text-xs font-medium px-2 py-0.5 rounded-full border-0 ${cfg.className}`}>
                        {cfg.label}
                      </Badge>
                    </div>
                  </CardHeader>
                </Card>
              </CardWrapper>
            );
          })}
        </div>
      </main>
    </div>
  );
};
