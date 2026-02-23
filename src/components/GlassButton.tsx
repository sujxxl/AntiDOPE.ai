import { motion, HTMLMotionProps } from 'framer-motion';
import { cn } from '../utils/cn';
import { useClickRipple } from '../hooks/useClickRipple';

interface GlassButtonProps extends HTMLMotionProps<'button'> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary';
}

export default function GlassButton({ children, className, variant = 'primary', onClick, ...props }: GlassButtonProps) {
  const { ripples, createRipple } = useClickRipple();

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    createRipple(event);
    onClick?.(event);
  }

  const variants = {
    primary: 'bg-white/10 hover:bg-white/20 border-white/20',
    secondary: 'bg-white/5 hover:bg-white/10 border-white/10',
  };

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={handleClick}
      className={cn(
        'relative overflow-hidden backdrop-blur-lg border rounded-lg px-6 py-2.5 text-sm font-semibold text-white shadow-lg',
        'transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
      {ripples.map((ripple, index) => (
        <span
          key={index}
          className="absolute bg-white/30 rounded-full animate-ripple"
          style={ripple}
        />
      ))}
    </motion.button>
  );
}
