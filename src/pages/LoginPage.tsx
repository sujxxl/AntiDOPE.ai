import GlassCard from '../components/GlassCard';
import GlassButton from '../components/GlassButton';
import { motion } from 'framer-motion';

type LoginPageProps = {
  onLogin: () => void;
};

export default function LoginPage({ onLogin }: LoginPageProps) {
  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <GlassCard className="w-full max-w-md">
        <div className="text-center mb-8">
          <motion.div 
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.2 }}
            className="inline-block w-16 h-16 bg-risk-high rounded-full shadow-glow-high mb-4"
          ></motion.div>
          <h1 className="text-3xl font-bold text-glass-white tracking-tighter">AntiDOPE.ai</h1>
          <p className="text-stone-400">Advanced Athlete Biological Passport Analysis</p>
        </div>
        <form className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-stone-300 mb-2">Email Address</label>
            <input type="email" className="w-full bg-white/5 backdrop-blur-lg border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all duration-300" placeholder="anya.sharma@agency.gov" />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-300 mb-2">Password</label>
            <input type="password" className="w-full bg-white/5 backdrop-blur-lg border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all duration-300" placeholder="••••••••" />
          </div>
          <GlassButton className="w-full" onClick={(e) => { e.preventDefault(); onLogin(); }}>
            Sign In
          </GlassButton>
        </form>
      </GlassCard>
    </div>
  );
}
