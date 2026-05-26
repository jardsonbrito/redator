import { BookOpen, Link2, FileText, Lightbulb, HelpCircle, AlignLeft, Star } from 'lucide-react';
import { JarvisIcon } from '@/components/icons/JarvisIcon';

const QUICK_ACTIONS = [
  { icon: FileText,    label: 'Corrigir tese',        texto: 'Quero que você analise minha tese:\n\n' },
  { icon: AlignLeft,   label: 'Analisar frase',        texto: 'Analise esta frase e me diga se usei corretamente:\n\n' },
  { icon: Link2,       label: 'Explicar conectivo',    texto: 'Explique como usar o conectivo: ' },
  { icon: Lightbulb,   label: 'Revisar argumento',     texto: 'Meu argumento ficou superficial? Veja:\n\n' },
  { icon: HelpCircle,  label: 'Dúvida gramatical',     texto: 'Tenho uma dúvida sobre: ' },
  { icon: BookOpen,    label: 'Revisar parágrafo',     texto: 'Revise este parágrafo:\n\n' },
  { icon: Star,        label: 'Entender repertório',   texto: 'Como usar repertório sociocultural na competência 2?' },
];

interface TutorEmptyStateProps {
  onQuickAction: (texto: string) => void;
}

export function TutorEmptyState({ onQuickAction }: TutorEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-6 py-12 select-none">
      <div className="w-16 h-16 mb-5 opacity-80">
        <JarvisIcon />
      </div>

      <h2 className="text-xl font-semibold text-gray-800 mb-1">Tutor Jarvis</h2>
      <p className="text-sm text-gray-500 mb-8 text-center max-w-xs">
        Seu professor particular de português e redação ENEM. Pergunte, analise, pratique.
      </p>

      <div className="grid grid-cols-2 gap-2 w-full max-w-sm">
        {QUICK_ACTIONS.map(({ icon: Icon, label, texto }) => (
          <button
            key={label}
            onClick={() => onQuickAction(texto)}
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 text-left transition-colors text-sm text-gray-700 font-medium shadow-sm"
          >
            <Icon className="w-4 h-4 text-indigo-500 flex-shrink-0" />
            <span className="truncate">{label}</span>
          </button>
        ))}
      </div>

      <p className="text-xs text-gray-400 mt-6">
        Clique em um atalho ou escreva sua pergunta abaixo
      </p>
    </div>
  );
}
