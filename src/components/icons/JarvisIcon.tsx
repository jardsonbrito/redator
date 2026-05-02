import jarvisMascote from '@/assets/jarvis-mascote.png';

interface JarvisIconProps {
  className?: string;
  size?: number;
}

export const JarvisIcon = ({ className, size = 120 }: JarvisIconProps) => {
  return (
    <img
      src={jarvisMascote}
      width={size}
      height={size}
      alt="Jarvis"
      className={className}
      style={{ objectFit: 'contain' }}
    />
  );
};
