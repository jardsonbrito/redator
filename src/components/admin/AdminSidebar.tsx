import { Sheet, SheetContent } from '@/components/ui/sheet';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  ClipboardCheck,
  MonitorPlay,
  MessageSquare,
  Settings,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const SECTIONS = [
  { id: 'visao-geral', label: 'Visão Geral', icon: LayoutDashboard },
  { id: 'usuarios', label: 'Usuários', icon: Users },
  { id: 'producao-pedagogica', label: 'Produção Pedagógica', icon: BookOpen },
  { id: 'correcoes-desempenho', label: 'Correções e Desempenho', icon: ClipboardCheck },
  { id: 'aulas-experiencias', label: 'Aulas e Experiências', icon: MonitorPlay },
  { id: 'comunicacao', label: 'Comunicação', icon: MessageSquare },
  { id: 'sistema', label: 'Sistema', icon: Settings },
];

interface AdminSidebarProps {
  activeSection: string;
  onSectionClick: (sectionId: string) => void;
  onNavigateDashboard: () => void;
  isMobileOpen: boolean;
  onMobileClose: () => void;
}

const SidebarInner = ({
  activeSection,
  onSectionClick,
  onNavigateDashboard,
}: Pick<AdminSidebarProps, 'activeSection' | 'onSectionClick' | 'onNavigateDashboard'>) => (
  <div className="flex flex-col h-full">
    {/* Logo */}
    <div className="px-4 pt-6 pb-5 border-b border-white/10">
      <button
        onClick={onNavigateDashboard}
        className="flex items-center gap-3 w-full text-left hover:opacity-90 transition-opacity"
        type="button"
      >
        <img
          src="/lovable-uploads/f86e5092-80dc-4e06-bb6a-f4cec6ee1b5b.png"
          alt="Logo Laboratório do Redator"
          className="w-10 h-10 rounded-full object-contain bg-white/10 p-0.5 flex-shrink-0"
        />
        <div>
          <p className="text-white font-semibold text-sm leading-tight">
            Laboratório<br />do Redator
          </p>
          <p className="text-white/50 text-[11px] mt-0.5 font-normal">Painel administrativo</p>
        </div>
      </button>
    </div>

    {/* Navigation */}
    <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
      {SECTIONS.map((section) => {
        const Icon = section.icon;
        const isActive = activeSection === section.id;
        return (
          <button
            key={section.id}
            type="button"
            onClick={() => onSectionClick(section.id)}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 text-left',
              isActive
                ? 'bg-violet-500/20 text-white'
                : 'text-white/60 hover:text-white/90 hover:bg-white/10'
            )}
          >
            <Icon
              className={cn(
                'w-4 h-4 flex-shrink-0',
                isActive ? 'text-violet-300' : 'text-white/40'
              )}
            />
            <span className="flex-1 truncate text-xs">{section.label}</span>
            {isActive && (
              <ChevronRight className="w-3 h-3 text-violet-300 flex-shrink-0" />
            )}
          </button>
        );
      })}
    </nav>

    {/* Footer */}
    <div className="px-4 py-3 border-t border-white/10">
      <p className="text-white/25 text-[10px] text-center">Laboratório do Redator</p>
    </div>
  </div>
);

export const AdminSidebar = ({
  activeSection,
  onSectionClick,
  onNavigateDashboard,
  isMobileOpen,
  onMobileClose,
}: AdminSidebarProps) => (
  <>
    {/* Desktop: sticky sidebar */}
    <aside className="hidden lg:flex lg:flex-col lg:w-60 lg:flex-shrink-0 bg-[#1E0A3C]">
      <div className="sticky top-0 h-screen overflow-y-auto">
        <SidebarInner
          activeSection={activeSection}
          onSectionClick={onSectionClick}
          onNavigateDashboard={onNavigateDashboard}
        />
      </div>
    </aside>

    {/* Mobile: Sheet drawer */}
    <Sheet open={isMobileOpen} onOpenChange={(open) => { if (!open) onMobileClose(); }}>
      <SheetContent side="left" className="p-0 w-64 bg-[#1E0A3C] border-none">
        <SidebarInner
          activeSection={activeSection}
          onSectionClick={onSectionClick}
          onNavigateDashboard={onNavigateDashboard}
        />
      </SheetContent>
    </Sheet>
  </>
);
