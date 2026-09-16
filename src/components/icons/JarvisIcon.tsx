interface JarvisIconProps {
  className?: string;
  size?: number;
}

export const JarvisIcon = ({ className, size = 24 }: JarvisIconProps) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Bolha de chat */}
      <path d="M1.5 4A2.5 2.5 0 0 1 4 1.5h10A2.5 2.5 0 0 1 16.5 4v9A2.5 2.5 0 0 1 14 15.5H9l-2 3.5-0.5-3.5H4A2.5 2.5 0 0 1 1.5 13Z" />

      {/* Sobrancelha esquerda */}
      <path d="M4.5 6Q6 4.5 7.5 6" strokeWidth="1.7" />
      {/* Sobrancelha direita */}
      <path d="M10.5 6Q12 4.5 13.5 6" strokeWidth="1.7" />

      {/* Olho esquerdo */}
      <circle cx="6" cy="8.5" r="1" fill="currentColor" stroke="none" />
      {/* Olho direito */}
      <circle cx="12" cy="8.5" r="1" fill="currentColor" stroke="none" />

      {/* Sorriso */}
      <path d="M5 11.5Q9 14 13 11.5" strokeWidth="1.7" />

      {/* Lápis — badge no canto inferior-direito */}
      <g transform="translate(18,18) rotate(45)">
        {/* Corpo do lápis */}
        <rect x="-0.85" y="-3" width="1.7" height="4.5" rx="0.3" strokeWidth="1.6" />
        {/* Ponta (triângulo preenchido) */}
        <path d="M-0.85 1.5 L0 4 L0.85 1.5Z" fill="currentColor" stroke="none" />
        {/* Linha da borracha */}
        <line x1="-0.85" y1="-2.3" x2="0.85" y2="-2.3" strokeWidth="0.9" />
      </g>
    </svg>
  );
};
