
import { useState, useEffect } from "react";
import { useCorretorAuth } from "@/hooks/useCorretorAuth";
import { useCorretorPermissoes } from "@/hooks/useCorretorPermissoes";
import { useAjudaRapida } from "@/hooks/useAjudaRapida";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { LogOut, Home, BookOpen, FileText, Menu, X, MessageCircle, Pencil, Check, GraduationCap, CalendarDays } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { CorretorAvatar } from "@/components/corretor/CorretorAvatar";
import { BreadcrumbNavigation } from "@/components/BreadcrumbNavigation";
import { CorretorNavigationProvider } from "@/hooks/useCorretorNavigationContext";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";

interface CorretorLayoutProps {
  children: React.ReactNode;
}

export const CorretorLayout = ({ children }: CorretorLayoutProps) => {
  const { corretor, logout, updateCorretorNome } = useCorretorAuth();
  const { podeGerenciar } = useCorretorPermissoes();
  const { buscarMensagensNaoLidas } = useAjudaRapida();
  const { toast } = useToast();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mensagensNaoLidas, setMensagensNaoLidas] = useState(0);
  const [perfilOpen, setPerfilOpen] = useState(false);
  const [editingNome, setEditingNome] = useState(false);
  const [nomeValue, setNomeValue] = useState("");
  const [savingNome, setSavingNome] = useState(false);

  useEffect(() => {
    if (corretor?.email) {
      const fetchMensagensNaoLidas = async () => {
        const count = await buscarMensagensNaoLidas(corretor.email);
        setMensagensNaoLidas(count);
      };
      
      fetchMensagensNaoLidas();
      
      // Atualizar a cada 30 segundos
      const interval = setInterval(fetchMensagensNaoLidas, 30000);
      return () => clearInterval(interval);
    }
  }, [corretor?.email, buscarMensagensNaoLidas]);

  const allMenuItems = [
    { icon: Home, label: "Home", path: "/corretor", apenasGerente: false },
    { icon: CalendarDays, label: "Calendário", path: "/corretor/calendario", apenasGerente: true },
    { icon: MessageCircle, label: "Recado dos Alunos", path: "/corretor/ajuda-rapida", apenasGerente: false },
    { icon: FileText, label: "Redações", path: "/corretor/redacoes-corretor", apenasGerente: false },
    { icon: BookOpen, label: "Temas", path: "/corretor/temas", apenasGerente: true },
    { icon: FileText, label: "Simulados", path: "/corretor/simulados", apenasGerente: true },
  ];

  const menuItems = allMenuItems.filter(item => !item.apenasGerente || podeGerenciar);

  return (
    <CorretorNavigationProvider>
      <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-cyan-50">
      {/* Header - Responsivo */}
      <header className="border-b border-violet-100 bg-white shadow-none">
        <div className="flex items-center justify-between px-3 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
            {isMobile && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-1 sm:p-2"
              >
                {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
            )}
            
            <img 
              src="/lovable-uploads/f86e5092-80dc-4e06-bb6a-f4cec6ee1b5b.png" 
              alt="Logo" 
              className="w-8 h-8 sm:w-10 sm:h-10 object-contain shrink-0" 
            />
            
            <div className="min-w-0 flex-1">
              <h1 className="text-base sm:text-xl font-bold text-violet-700 truncate">
                {isMobile ? "Corretor" : "Painel do Corretor"}
              </h1>
              <p className="text-xs text-violet-400 font-medium truncate hidden sm:block">
                Central Operacional
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Sheet de perfil */}
            <Sheet open={perfilOpen} onOpenChange={(open) => {
              setPerfilOpen(open);
              if (open) { setEditingNome(false); setNomeValue(corretor?.nome_completo || ""); }
            }}>
              <SheetTrigger asChild>
                <button className="flex items-center gap-2 sm:gap-3 hover:opacity-80 transition-opacity rounded-xl p-1">
                  <CorretorAvatar size="sm" showUpload={false} />
                  {!isMobile && (
                    <div className="flex flex-col text-left">
                      <span className="text-foreground font-medium text-xs sm:text-sm truncate max-w-32 sm:max-w-none leading-tight">
                        {corretor?.nome_completo || 'Corretor'}
                      </span>
                      <span className="text-violet-500 text-xs font-medium leading-tight">Corretor</span>
                    </div>
                  )}
                </button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[310px] sm:w-[360px] overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>Meu Perfil</SheetTitle>
                </SheetHeader>

                <div className="mt-6 space-y-6">
                  {/* Avatar grande */}
                  <div className="flex flex-col items-center gap-2">
                    <CorretorAvatar size="lg" showUpload={true} />
                    <p className="text-xs text-center text-violet-500 font-medium italic">Área do Corretor</p>
                  </div>

                  <Separator />

                  {/* Dados */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-xs text-slate-400 uppercase tracking-wide">Dados Principais</h3>

                    {/* Nome editável */}
                    <div className="space-y-1">
                      <p className="text-xs text-slate-400">Nome</p>
                      {editingNome ? (
                        <div className="flex items-center gap-2">
                          <Input
                            value={nomeValue}
                            onChange={e => setNomeValue(e.target.value)}
                            className="h-8 text-sm"
                            autoFocus
                            onKeyDown={async e => {
                              if (e.key === 'Enter') {
                                if (!nomeValue.trim()) return;
                                setSavingNome(true);
                                try {
                                  await updateCorretorNome(nomeValue);
                                  toast({ title: "Nome atualizado!" });
                                  setEditingNome(false);
                                } catch {
                                  toast({ title: "Erro ao salvar nome.", variant: "destructive" });
                                } finally { setSavingNome(false); }
                              }
                              if (e.key === 'Escape') { setEditingNome(false); setNomeValue(corretor?.nome_completo || ""); }
                            }}
                          />
                          <button
                            disabled={savingNome || !nomeValue.trim()}
                            onClick={async () => {
                              if (!nomeValue.trim()) return;
                              setSavingNome(true);
                              try {
                                await updateCorretorNome(nomeValue);
                                toast({ title: "Nome atualizado!" });
                                setEditingNome(false);
                              } catch {
                                toast({ title: "Erro ao salvar nome.", variant: "destructive" });
                              } finally { setSavingNome(false); }
                            }}
                            className="text-emerald-600 hover:text-emerald-700 disabled:opacity-40"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => { setEditingNome(false); setNomeValue(corretor?.nome_completo || ""); }}
                            className="text-slate-400 hover:text-red-500"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-slate-800">{corretor?.nome_completo || '—'}</p>
                          <button
                            onClick={() => { setEditingNome(true); setNomeValue(corretor?.nome_completo || ""); }}
                            className="text-slate-400 hover:text-violet-600 transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Email */}
                    <div className="space-y-1">
                      <p className="text-xs text-slate-400">E-mail</p>
                      <p className="text-sm text-slate-600">{corretor?.email || '—'}</p>
                    </div>

                    {/* Tipo */}
                    <div className="flex items-center gap-2 pt-1">
                      <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-xs text-slate-500">Tipo de usuário:</span>
                      <Badge variant="secondary" className="text-xs px-2 py-0.5">Corretor</Badge>
                    </div>
                  </div>

                  <Separator />

                  {/* Sair */}
                  <Button
                    variant="outline"
                    className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 gap-2"
                    onClick={() => { setPerfilOpen(false); logout(); }}
                  >
                    <LogOut className="w-4 h-4" />
                    Sair da conta
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
        
        {/* Breadcrumbs */}
        <div className="px-3 sm:px-6 py-2 border-b border-violet-50 bg-transparent">
          <BreadcrumbNavigation basePath="/corretor" />
        </div>
      </header>

      <div className="flex relative">
        {/* Sidebar - Responsiva */}
        <aside className={`
          ${isMobile 
            ? `fixed inset-y-0 left-0 z-50 w-64 bg-white border-r shadow-lg transform transition-transform duration-300 ease-in-out ${
                sidebarOpen ? 'translate-x-0' : '-translate-x-full'
              } top-[73px]`
            : 'w-52 lg:w-64 bg-white border-r border-violet-100 shadow-none'
          } min-h-[calc(100vh-73px)]
        `}>
          {isMobile && sidebarOpen && (
            <div 
              className="fixed inset-0 bg-black/20 z-40 top-[73px]"
              onClick={() => setSidebarOpen(false)}
            />
          )}
          
          <nav className="p-3 sm:p-4 relative z-50 bg-white">
            <ul className="space-y-1 sm:space-y-2">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                
                return (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      onClick={() => isMobile && setSidebarOpen(false)}
                      className={`flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-2 rounded-lg transition-colors text-sm font-medium ${
                        isActive
                          ? 'bg-violet-600 text-white shadow-sm'
                          : 'text-slate-600 hover:bg-violet-50 hover:text-violet-700'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                      {item.label === "Recado dos Alunos" && mensagensNaoLidas > 0 && (
                        <Badge variant="destructive" className="ml-auto rounded-full text-xs min-w-[1.25rem] h-5 flex items-center justify-center">
                          {mensagensNaoLidas}
                        </Badge>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </aside>

        {/* Main Content - Responsivo */}
        <main className="flex-1 p-3 sm:p-6 min-w-0">
          {children}
        </main>
      </div>
      </div>
    </CorretorNavigationProvider>
  );
};
