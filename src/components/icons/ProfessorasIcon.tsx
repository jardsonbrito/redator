import { UserRound, BookOpen } from 'lucide-react';
import React from 'react';

type Props = {
  className?: string;
  style?: React.CSSProperties;
  strokeWidth?: number;
};

/**
 * Ícone composto para o módulo "Professores/Professoras":
 * pessoa (UserRound) com livro aberto (BookOpen) sobreposto no canto inferior direito.
 * Comunica docência/formação, diferenciando de Alunos.
 */
export function ProfessorasIcon({ className = '', style, strokeWidth = 2.2 }: Props) {
  return (
    <div className={`relative inline-flex shrink-0 ${className}`} style={style}>
      <UserRound
        className="w-full h-full"
        strokeWidth={strokeWidth}
      />
      <div className="absolute -right-1 -bottom-1 rounded-full bg-white p-[2px] ring-1 ring-zinc-200">
        <BookOpen
          className="w-[35%] h-[35%]"
          strokeWidth={2.4}
        />
      </div>
    </div>
  );
}
