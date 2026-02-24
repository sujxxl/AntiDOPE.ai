import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import MainLayout from './layouts/MainLayout';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import AthleteProfilePage from './pages/AthleteProfilePage';
import RiskReportPage from './pages/RiskReportPage';
import ReportsPage from './pages/ReportsPage';
import UploadPage from './pages/UploadPage';
import SearchFilterPage from './pages/SearchFilterPage';
import { hasSupabaseConfig, supabase } from './lib/supabase';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  useEffect(() => {
    if (!hasSupabaseConfig || !supabase) {
      setIsLoadingAuth(false);
      return;
    }

    let isMounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (isMounted) {
        setSession(data.session ?? null);
        setIsLoadingAuth(false);
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setIsLoadingAuth(false);
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const isAuthenticated = Boolean(session);

  const handleLogout = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    setSession(null);
  };

  if (isLoadingAuth) {
    return (
      <div className="relative min-h-screen w-full overflow-hidden bg-glass-black flex items-center justify-center text-stone-300">
        Checking session...
      </div>
    );
  }

  const router = createBrowserRouter([
    {
      path: '/login',
      element: !isAuthenticated ? <LoginPage /> : <Navigate to="/" />,
    },
    {
      path: '/',
      element: isAuthenticated ? <MainLayout onLogout={handleLogout} userEmail={session?.user?.email} /> : <Navigate to="/login" />,
      children: [
        { index: true, element: <Dashboard /> },
        { path: 'athlete/:id', element: <AthleteProfilePage /> },
        { path: 'reports', element: <ReportsPage /> },
        { path: 'report/:id', element: <RiskReportPage /> },
        { path: 'upload', element: <UploadPage /> },
        { path: 'search', element: <SearchFilterPage /> },
      ],
    },
  ]);

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-glass-black">
      {/* 
        Performance Strategy: Background Animation
        - The background is a single animated gradient div, which is GPU-accelerated.
        - Using `background-position` is more performant than animating gradient properties directly.
        - The `backdrop-blur` is applied to a separate overlay, allowing the browser to optimize the layers.
        - This isolates the expensive blur effect from the content, preventing re-renders of the blur when content changes.
      */}
      <motion.div
        initial={{ backgroundPosition: '0% 50%' }}
        animate={{ backgroundPosition: '100% 50%' }}
        transition={{
          duration: 20,
          repeat: Infinity,
          repeatType: 'reverse',
          ease: 'linear',
        }}
        className="absolute inset-0 z-0 bg-gradient-to-br from-indigo-900/20 via-purple-900/10 to-stone-900/20 bg-[size:400%_400%]"
      />
      <div className="absolute inset-0 z-10 bg-black/20 backdrop-blur-2xl"></div>
      <div className="relative z-20">
        <RouterProvider router={router} />
      </div>
    </div>
  );
}
