import { FileText, Search } from 'lucide-react';
import React from 'react';

type Props = {
  className?: string;
  style?: React.CSSProperties;
  strokeWidth?: number;
};

/**
 * Ícone composto para o módulo "Redações Comentadas":
 * documento (FileText) com lupa (Search) sobreposta no canto inferior direito.
 * Aceita `className` para tamanho e `style` para cor via currentColor.
 */
export function RedacoesComentadasIcon({ className = '', style, strokeWidth = 2.2 }: Props) {
  return (
    <div className={`relative inline-flex shrink-0 ${className}`} style={style}>
      <FileText
        className="w-full h-full"
        strokeWidth={strokeWidth}
      />
      <div className="absolute -right-1 -bottom-1 rounded-full bg-white p-[2px] ring-1 ring-zinc-200">
        <Search
          className="w-[35%] h-[35%]"
          strokeWidth={2.4}
        />
      </div>
    </div>
  );
}
