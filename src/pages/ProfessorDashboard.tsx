import { useProfessorAuth } from "@/hooks/useProfessorAuth";
import { useProfessorFeatures } from "@/hooks/useProfessorFeatures";
import { Navigate, Link } from "react-router-dom";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen,
  BookMarked,
  FileText,
  Video,
  Library,
  LogOut,
  GraduationCap,
  Lightbulb,
  Layers,
  Bot,
  Map,
  PlayCircle,
  Loader2,
} from "lucide-react";
import { RedacoesComentadasIcon } from "@/components/icons/RedacoesComentadasIcon";
import { ProfessorAvatar } from "@/components/professor/ProfessorAvatar";
import { LucideIcon } from "lucide-react";

// Mapeamento de ícones por chave de funcionalidade
const iconMapping: Record<string, LucideIcon | any> = {
  temas: Lightbulb,
  guia_tematico: Map,
  repertorio_orientado: BookMarked,
  redacoes_exemplares: FileText,
  redacoes_comentadas: RedacoesComentadasIcon,
  aulas_gravadas: PlayCircle,
  aulas_ao_vivo: Video,
  biblioteca: Library,
  microaprendizagem: Layers,
  jarvis_correcao: Bot,
  videoteca: Video,
  lousa: BookOpen,
  exercicios: FileText,
  simulados: FileText,
};

// Mapeamento de rotas por chave de funcionalidade
const routeMapping: Record<string, string | null> = {
  temas: "/professor/temas",
  guia_tematico: "/professor/guia-tematico",
  repertorio_orientado: "/professor/repertorio",
  redacoes_exemplares: "/professor/redacoes",
  redacoes_comentadas: null, // Ainda não implementado
  aulas_gravadas: "/professor/aulas",
  aulas_ao_vivo: "/professor/salas-virtuais",
  biblioteca: "/professor/biblioteca",
  microaprendizagem: null, // Ainda não implementado
  jarvis_correcao: "/professor/jarvis-correcao",
  videoteca: "/professor/videoteca",
};

// Determinar categoria/origem do card
const getCardOrigin = (chave: string): "herdado" | "exclusivo" | "filtrado" => {
  if (chave === "jarvis_correcao") return "exclusivo";
  if (chave === "microaprendizagem") return "filtrado";
  return "herdado";
};

const origemConfig: Record<string, { label: string; className: string }> = {
  herdado: { label: "Herdado do app", className: "bg-gray-100 text-gray-500" },
  exclusivo: { label: "Exclusivo professor", className: "bg-violet-100 text-violet-600" },
  filtrado: { label: "Filtrado", className: "bg-blue-100 text-blue-600" },
};

export const ProfessorDashboard = () => {
  const { professor, logout } = useProfessorAuth();
  const { funcionalidadesOrdenadas, isLoading } = useProfessorFeatures();

  if (!professor) return <Navigate to="/professor/login" replace />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-sm shadow-lg border-b border-primary/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <Link
              to="/"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
            >
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
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {funcionalidadesOrdenadas.map((func) => {
              const IconComponent = iconMapping[func.chave] || FileText;
              const path = routeMapping[func.chave] || null;
              const origem = getCardOrigin(func.chave);
              const cfg = origemConfig[origem];

              const CardWrapper = path
                ? ({ children }: { children: React.ReactNode }) => (
                    <Link to={path}>{children}</Link>
                  )
                : ({ children }: { children: React.ReactNode }) => (
                    <div className="cursor-not-allowed opacity-60">{children}</div>
                  );

              return (
                <CardWrapper key={func.chave}>
                  <Card className="group h-full bg-white/80 border border-primary/10 hover:shadow-xl hover:bg-white hover:border-primary/20 transition-all duration-300 rounded-2xl overflow-hidden">
                    <CardHeader className="p-6 text-center">
                      <div className="flex flex-col items-center gap-4">
                        <div className="p-4 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 group-hover:from-primary/20 group-hover:to-accent/20 transition-all duration-300">
                          <IconComponent className="w-8 h-8 text-primary group-hover:text-accent transition-colors duration-300" />
                        </div>
                        <CardTitle className="text-lg font-semibold text-primary group-hover:text-accent transition-colors duration-300">
                          {func.nome_exibicao}
                        </CardTitle>
                        <Badge
                          className={`text-xs font-medium px-2 py-0.5 rounded-full border-0 ${cfg.className}`}
                        >
                          {cfg.label}
                        </Badge>
                      </div>
                    </CardHeader>
                  </Card>
                </CardWrapper>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};
