import { useState } from 'react';
import { Check, ChevronsUpDown, PlusCircle } from 'lucide-react';
import { Athlete } from '../data/athletes';
import RiskBadge from './RiskBadge';

interface AthleteSelectProps {
  athletes: Athlete[];
  selectedAthlete: Athlete | null;
  onSelectAthlete: (athlete: Athlete | null) => void;
  onCreateNew: () => void;
}

export default function AthleteSelect({ athletes, selectedAthlete, onSelectAthlete, onCreateNew }: AthleteSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredAthletes = athletes.filter(a =>
    a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.id.includes(searchTerm)
  );

  return (
    <div className="relative w-full">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between bg-white/5 backdrop-blur-lg border border-white/10 rounded-lg px-4 py-3 text-white text-left"
      >
        {selectedAthlete ? (
          <span>{selectedAthlete.name} ({selectedAthlete.id})</span>
        ) : (
          <span className="text-stone-400">Select an athlete...</span>
        )}
        <ChevronsUpDown className="w-4 h-4 text-stone-400" />
      </button>

      {isOpen && (
        <div className="absolute z-10 top-full mt-2 w-full bg-glass-black border border-glass-stroke rounded-lg shadow-lg">
          <div className="p-2">
            <input
              type="text"
              placeholder="Search by name or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-white placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-white/20"
            />
          </div>
          <ul className="max-h-60 overflow-y-auto">
            {filteredAthletes.map(athlete => (
              <li
                key={athlete.id}
                onClick={() => { onSelectAthlete(athlete); setIsOpen(false); }}
                className="flex items-center justify-between p-3 hover:bg-glass-highlight cursor-pointer"
              >
                <div>
                  <p className="font-semibold">{athlete.name} <span className="text-sm text-stone-400">({athlete.id})</span></p>
                  <p className="text-xs text-stone-400">{athlete.sport}</p>
                  <p className="text-xs text-stone-500">Last analysis: {athlete.lastInference.confidence > 0 ? new Date(athlete.lastInference.timestamp).toLocaleDateString() : 'Not available'}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Check className={`w-4 h-4 ${selectedAthlete?.id === athlete.id ? 'text-risk-low' : 'text-transparent'}`} />
                  <RiskBadge level={athlete.models.compositeRisk.level} />
                </div>
              </li>
            ))}
            <li
              onClick={onCreateNew}
              className="flex items-center gap-2 p-3 hover:bg-glass-highlight cursor-pointer border-t border-glass-stroke mt-1"
            >
              <PlusCircle className="w-5 h-5 text-risk-low" />
              <span className="font-semibold text-risk-low">+ Create New Athlete</span>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
