import { ChevronDown } from 'lucide-react';

export default function FilterDropdown() {
  return (
    <div className="relative">
      <button className="flex items-center gap-2 bg-white/5 backdrop-blur-lg border border-white/10 rounded-lg px-4 py-3 text-sm font-medium text-white hover:bg-white/10 transition-colors duration-300">
        <span>Filter by Risk</span>
        <ChevronDown className="w-4 h-4" />
      </button>
      {/* Dropdown content can be added here */}
    </div>
  );
}
