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
      {/* Cabeça arredondada */}
      <rect x="3" y="2" width="18" height="15" rx="4" />

      {/* Sobrancelha esquerda — expressão de professor */}
      <path d="M7 7.5 Q9 6 11 7.5" strokeWidth="1.5" />

      {/* Sobrancelha direita */}
      <path d="M13 7.5 Q15 6 17 7.5" strokeWidth="1.5" />

      {/* Olho esquerdo preenchido */}
      <circle cx="9" cy="11" r="1.5" fill="currentColor" stroke="none" />

      {/* Olho direito preenchido */}
      <circle cx="15" cy="11" r="1.5" fill="currentColor" stroke="none" />

      {/* Sorriso sutil */}
      <path d="M9 14 Q12 16 15 14" strokeWidth="1.5" />

      {/* Colarinho do terno — referência ao traje do mascote */}
      <path d="M5 17 L10 17 L12 21 L14 17 L19 17" strokeWidth="1.5" />
    </svg>
  );
};
