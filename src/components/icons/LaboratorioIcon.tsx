// Ícone do Laboratório de Repertório — três nós conectados em triângulo
// Compatível com API Lucide (className) e API phosphor-react (size, color)

interface LaboratorioIconProps {
  className?: string;
  // phosphor-react compat
  size?: number;
  color?: string;
  weight?: string;
}

export function LaboratorioIcon({ className, size, color }: LaboratorioIconProps) {
  const resolvedSize = size ?? 24;
  const resolvedColor = color ?? 'currentColor';

  return (
    <svg
      width={resolvedSize}
      height={resolvedSize}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      style={color ? { color } : undefined}
    >
      <path
        d="M12 6L7 16H17L12 6Z"
        stroke={resolvedColor}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="6" r="1.9" fill={resolvedColor} />
      <circle cx="7" cy="16" r="1.9" fill={resolvedColor} />
      <circle cx="17" cy="16" r="1.9" fill={resolvedColor} />
    </svg>
  );
}
