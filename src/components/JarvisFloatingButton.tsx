import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { History, Sparkles, PenLine, ScanSearch, X, GraduationCap } from "lucide-react";
import { JarvisIcon } from "@/components/icons/JarvisIcon";
import { cn } from "@/lib/utils";

const actions = [
  {
    label: "Analisar minha redação",
    icon: ScanSearch,
    href: "/jarvis?modoIndex=0",
  },
  {
    label: "Melhorar meu texto",
    icon: Sparkles,
    href: "/jarvis?modoIndex=1",
  },
  {
    label: "Me ajudar a começar",
    icon: PenLine,
    href: "/jarvis?modoIndex=2",
  },
  {
    label: "Tutor Jarvis",
    icon: GraduationCap,
    href: "/jarvis/tutor",
  },
  {
    label: "Ver histórico",
    icon: History,
    href: "/jarvis?view=historico",
  },
];

export const JarvisFloatingButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const handleAction = (href: string) => {
    setIsOpen(false);
    navigate(href);
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Container fixo — empilha painel e botão verticalmente */}
      <div className="fixed bottom-20 right-4 z-50 flex flex-col items-end gap-3">

        {/* Painel de ações rápidas */}
        <div
          className={cn(
            "bg-white rounded-2xl shadow-xl border border-purple-100 overflow-hidden transition-all duration-200 origin-bottom-right",
            isOpen
              ? "opacity-100 scale-100 pointer-events-auto"
              : "opacity-0 scale-95 pointer-events-none"
          )}
          style={{ minWidth: "220px" }}
        >
          {/* Cabeçalho do painel */}
          <div className="flex items-center justify-between px-4 py-3 bg-indigo-700 text-white">
            <div className="flex items-center gap-2">
              <JarvisIcon size={18} className="text-white" />
              <span className="text-sm font-semibold">Jarvis</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white/70 hover:text-white transition-colors"
              aria-label="Fechar painel Jarvis"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Lista de ações */}
          <div className="py-1">
            {actions.map((action) => {
              const Icon = action.icon;
              const isLast = false;
              return (
                <button
                  key={action.href}
                  onClick={() => handleAction(action.href)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors",
                    isLast
                      ? "text-indigo-600 hover:bg-indigo-50 border-t border-gray-100 mt-1 pt-3"
                      : "text-gray-700 hover:bg-purple-50 hover:text-indigo-700"
                  )}
                >
                  <Icon className="w-4 h-4 shrink-0 text-indigo-400" />
                  {action.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Botão flutuante principal */}
        <button
          onClick={() => setIsOpen((prev) => !prev)}
          aria-label={isOpen ? "Fechar Jarvis" : "Abrir Jarvis"}
          className={cn(
            "w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-200",
            "bg-indigo-700 hover:bg-indigo-800 text-white",
            isOpen && "ring-4 ring-indigo-300"
          )}
        >
          <JarvisIcon size={26} className="text-white" />
        </button>
      </div>
    </>
  );
};
