import { Search } from 'lucide-react';

export default function GlassSearchBar() {
  return (
    <div className="relative">
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400 pointer-events-none" />
      <input
        type="text"
        placeholder="Search athletes, reports..."
        className="w-full bg-white/5 backdrop-blur-lg border border-white/10 rounded-lg pl-12 pr-4 py-3 text-white placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all duration-300"
      />
    </div>
  );
}
