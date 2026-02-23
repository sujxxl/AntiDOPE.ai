import { BarChart, Home, Search, Upload, User, Users } from 'lucide-react';
import { NavLink } from 'react-router-dom';

const navItems = [
  { name: 'Dashboard', icon: Home, href: '/' },
  { name: 'Athletes', icon: Users, href: '/search' },
  { name: 'Reports', icon: BarChart, href: '/report/4829' }, // Example link
  { name: 'Upload Data', icon: Upload, href: '/upload' },
];

export default function Sidebar() {
  return (
    <aside className="w-64 flex-shrink-0 bg-black/20 backdrop-blur-lg border-r border-glass-stroke p-6 flex flex-col">
      <div className="flex items-center gap-2 mb-12">
        <div className="w-8 h-8 bg-risk-high rounded-full shadow-glow-high"></div>
        <h1 className="text-xl font-bold text-glass-white tracking-tighter">AntiDOPE.ai</h1>
      </div>
      <nav className="flex-1">
        <ul className="space-y-2">
          {navItems.map((item) => (
            <li key={item.name}>
              <NavLink 
                to={item.href} 
                className={({ isActive }) => 
                  `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors duration-300 ${isActive ? 'bg-glass-highlight text-white' : 'text-stone-300 hover:text-white hover:bg-glass-highlight'}`
                }
              >
                <item.icon className="w-5 h-5" />
                <span>{item.name}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <div className="mt-auto">
        <div className="flex items-center gap-3 p-4 bg-glass-highlight rounded-lg border border-glass-stroke">
          <User className="w-8 h-8 p-1.5 bg-stone-700 text-stone-300 rounded-full" />
          <div>
            <p className="font-semibold text-white">Dr. Anya Sharma</p>
            <p className="text-xs text-stone-400">Lead Analyst</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
