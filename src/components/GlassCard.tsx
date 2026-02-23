import { motion } from 'framer-motion';
import { cn } from '../utils/cn';

type GlassCardProps = {
  children: React.ReactNode;
  className?: string;
};

/*
 * Performance & Accessibility Strategy: GlassCard
 * - Performance: The subtle noise overlay is a repeating SVG background image, which is very lightweight.
 *   The `backdrop-blur` is the most expensive property. It's applied here, but should be used on a limited number of cards visible at once.
 *   For pages with many cards, consider using pagination or virtualization to limit the number of blurred elements on screen.
 * - Accessibility: The `bg-white/5` provides a very subtle background. It's crucial that text placed on this card has sufficient contrast.
 *   The default `text-glass-white` (80% opacity) is generally acceptable, but for smaller body text, pure white (`#FFFFFF`) is recommended.
 *   Ensure interactive elements inside the card have clear focus states.
 */
export default function GlassCard({ children, className }: GlassCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className={cn(
        'relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-lg',
        'before:absolute before:inset-0 before:bg-repeat before:bg-center before:opacity-[0.03] before:[background-image:url(\'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><rect x="0" y="0" width="40" height="40" fill="none"/><path d="M20 0L0 20M40 20L20 40M20 0L40 20M0 20L20 40" stroke-width="1" stroke="white"/></svg>\')]',
        className
      )}
    >
      <div className="relative z-10 p-6">
        {children}
      </div>
    </motion.div>
  );
}
