import { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import GlassCard from './GlassCard';
import GlassButton from './GlassButton';
import { Athlete } from '../data/athletes';

interface CreateAthleteModalProps {
  onClose: () => void;
  onCreate: (payload: {
    name: string;
    id: string;
    age: number;
    sport: string;
    gender: Athlete['gender'];
    baselineMetrics?: Athlete['baselineMetrics'];
  }) => void;
  generateId: () => string;
}

export default function CreateAthleteModal({ onClose, onCreate, generateId }: CreateAthleteModalProps) {
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const [name, setName] = useState('');
  const [id, setId] = useState(() => generateId());
  const [age, setAge] = useState('');
  const [sport, setSport] = useState('');
  const [gender, setGender] = useState<Athlete['gender']>('Female');
  const [restingHr, setRestingHr] = useState('');
  const [baselineHgb, setBaselineHgb] = useState('');
  const [baselineRetPct, setBaselineRetPct] = useState('');

  const isFormValid = useMemo(() => {
    return name.trim() && uuidPattern.test(id.trim()) && sport.trim() && Number(age) > 0;
  }, [age, id, name, sport]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (!isFormValid) {
      return;
    }

    onCreate({
      name: name.trim(),
      id: id.trim(),
      age: Number(age),
      sport: sport.trim(),
      gender,
      baselineMetrics: {
        restingHr: restingHr ? Number(restingHr) : undefined,
        baselineHgb: baselineHgb ? Number(baselineHgb) : undefined,
        baselineRetPct: baselineRetPct ? Number(baselineRetPct) : undefined,
      },
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-lg">
      <GlassCard className="w-full max-w-lg">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-glass-white">Create New Athlete</h2>
          <button onClick={onClose} className="text-stone-400 hover:text-white">
            <X />
          </button>
        </div>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-stone-300 mb-2">Full Name</label>
              <input type="text" value={name} onChange={(event) => setName(event.target.value)} className="w-full bg-white/5 backdrop-blur-lg border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-white/20" />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-300 mb-2">Athlete ID</label>
              <div className="flex gap-2">
                <input type="text" value={id} onChange={(event) => setId(event.target.value)} className="w-full bg-white/5 backdrop-blur-lg border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-white/20" />
                <GlassButton type="button" variant="secondary" onClick={() => setId(generateId())}>Auto</GlassButton>
              </div>
              {!uuidPattern.test(id.trim()) ? (
                <p className="text-xs text-risk-high mt-1">Athlete ID must be a valid UUID.</p>
              ) : null}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-stone-300 mb-2">Age</label>
              <input type="number" min={10} value={age} onChange={(event) => setAge(event.target.value)} className="w-full bg-white/5 backdrop-blur-lg border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-white/20" />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-300 mb-2">Gender</label>
              <select value={gender} onChange={(event) => setGender(event.target.value as Athlete['gender'])} className="w-full bg-white/5 backdrop-blur-lg border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-white/20">
                <option>Female</option>
                <option>Male</option>
                <option>Other</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-300 mb-2">Sport</label>
            <input type="text" value={sport} onChange={(event) => setSport(event.target.value)} className="w-full bg-white/5 backdrop-blur-lg border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-white/20" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-stone-300 mb-2">Baseline HR (optional)</label>
              <input type="number" value={restingHr} onChange={(event) => setRestingHr(event.target.value)} className="w-full bg-white/5 backdrop-blur-lg border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-white/20" />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-300 mb-2">Baseline HGB (optional)</label>
              <input type="number" step="0.1" value={baselineHgb} onChange={(event) => setBaselineHgb(event.target.value)} className="w-full bg-white/5 backdrop-blur-lg border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-white/20" />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-300 mb-2">Baseline RET% (optional)</label>
              <input type="number" step="0.1" value={baselineRetPct} onChange={(event) => setBaselineRetPct(event.target.value)} className="w-full bg-white/5 backdrop-blur-lg border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-white/20" />
            </div>
          </div>
          <div className="flex justify-end gap-4 pt-4">
            <GlassButton type="button" variant="secondary" onClick={onClose}>Cancel</GlassButton>
            <GlassButton type="submit" disabled={!isFormValid}>Create Athlete</GlassButton>
          </div>
        </form>
      </GlassCard>
    </div>
  );
}
