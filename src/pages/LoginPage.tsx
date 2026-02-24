import { FormEvent, useState } from 'react';
import GlassCard from '../components/GlassCard';
import GlassButton from '../components/GlassButton';
import { motion } from 'framer-motion';
import { hasSupabaseConfig, supabase } from '../lib/supabase';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!hasSupabaseConfig || !supabase) {
      setError('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
      return;
    }

    if (!email.trim() || !password) {
      setError('Enter both email and password.');
      return;
    }

    setIsSubmitting(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signInError) {
      setError(signInError.message);
    }

    setIsSubmitting(false);
  };

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
        <form className="space-y-6" onSubmit={handleSubmit}>
          {error ? (
            <div className="rounded-lg border border-risk-high/40 bg-risk-high/10 px-3 py-2 text-sm text-red-200">
              {error}
            </div>
          ) : null}
          <div>
            <label className="block text-sm font-medium text-stone-300 mb-2">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full bg-white/5 backdrop-blur-lg border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all duration-300"
              placeholder="anya.sharma@agency.gov"
              autoComplete="email"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-300 mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full bg-white/5 backdrop-blur-lg border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all duration-300"
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>
          <GlassButton className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Signing In...' : 'Sign In'}
          </GlassButton>
        </form>
      </GlassCard>
    </div>
  );
}
