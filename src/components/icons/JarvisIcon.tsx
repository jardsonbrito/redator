interface JarvisIconProps {
  className?: string;
  size?: number;
}

export const JarvisIcon = ({ className, size = 120 }: JarvisIconProps) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Cabeça */}
      <rect x="20" y="20" width="80" height="60" rx="20" fill="#E6F0FF"/>

      {/* Tela */}
      <rect x="30" y="30" width="60" height="40" rx="12" fill="#0F172A"/>

      {/* Olho esquerdo */}
      <circle cx="50" cy="50" r="6" fill="#38BDF8"/>

      {/* Olho direito (wink) */}
      <path d="M65 50 Q70 45 75 50" stroke="#38BDF8" strokeWidth="2" fill="none"/>

      {/* Sorriso */}
      <path d="M50 60 Q60 68 70 60" stroke="#38BDF8" strokeWidth="2" fill="none"/>

      {/* Antenas */}
      <line x1="35" y1="20" x2="30" y2="10" stroke="#94A3B8" strokeWidth="2"/>
      <circle cx="30" cy="10" r="3" fill="#38BDF8"/>

      <line x1="85" y1="20" x2="90" y2="10" stroke="#94A3B8" strokeWidth="2"/>
      <circle cx="90" cy="10" r="3" fill="#38BDF8"/>

      {/* Corpo */}
      <rect x="35" y="80" width="50" height="25" rx="10" fill="#E6F0FF"/>

      {/* Núcleo */}
      <circle cx="60" cy="92" r="6" fill="#38BDF8"/>
    </svg>
  );
};
