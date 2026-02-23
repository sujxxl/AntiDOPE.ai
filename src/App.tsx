import { useState } from 'react';
import { motion } from 'framer-motion';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import AthleteProfilePage from './pages/AthleteProfilePage';
import RiskReportPage from './pages/RiskReportPage';
import ReportsPage from './pages/ReportsPage';
import UploadPage from './pages/UploadPage';
import SearchFilterPage from './pages/SearchFilterPage';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const handleLogin = () => setIsAuthenticated(true);
  const handleLogout = () => setIsAuthenticated(false); // Example logout function

  const router = createBrowserRouter([
    {
      path: '/login',
      element: !isAuthenticated ? <LoginPage onLogin={handleLogin} /> : <Navigate to="/" />,
    },
    {
      path: '/',
      element: isAuthenticated ? <MainLayout /> : <Navigate to="/login" />,
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
