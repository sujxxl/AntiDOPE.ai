import { Bell, LogOut, Search } from 'lucide-react';

type HeaderProps = {
  onLogout: () => void;
  userEmail?: string;
};

export default function Header({ onLogout, userEmail }: HeaderProps) {
  return (
    <header className="h-20 flex-shrink-0 flex items-center justify-between px-8 border-b border-glass-stroke">
      <div>
        {/* Search bar can go here */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
          <input 
            type="text"
            placeholder="Search athletes, reports..."
            className="w-96 bg-glass-highlight border border-transparent hover:border-glass-stroke focus:border-glass-stroke focus:ring-0 focus:outline-none rounded-lg pl-10 pr-4 py-2.5 text-glass-white placeholder:text-stone-400 transition-colors duration-300"
          />
        </div>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-sm text-stone-300 max-w-56 truncate">{userEmail ?? 'Authenticated User'}</span>
        <button className="p-2.5 rounded-full hover:bg-glass-highlight transition-colors duration-300">
          <Bell className="w-6 h-6 text-stone-300" />
        </button>
        <button
          type="button"
          onClick={onLogout}
          className="p-2.5 rounded-full hover:bg-glass-highlight transition-colors duration-300"
          title="Sign out"
        >
          <LogOut className="w-5 h-5 text-stone-300" />
        </button>
        <div className="w-10 h-10 bg-stone-700 rounded-full border-2 border-risk-moderate shadow-glow-moderate"></div>
      </div>
    </header>
  );
}
