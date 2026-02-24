import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import GlassCard from '../components/GlassCard';
import GlassButton from '../components/GlassButton';
import { useAthletes } from '../hooks/useAthletes';
import type { Athlete } from '../data/athletes';

export default function AthleteEditPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { athletes, updateAthleteProfile } = useAthletes();

    const athlete = athletes.find((item) => item.id === id);

    const [name, setName] = useState('');
    const [sport, setSport] = useState('');
    const [age, setAge] = useState(18);
    const [gender, setGender] = useState<Athlete['gender']>('Other');
    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (!athlete) {
            return;
        }

        setName(athlete.name);
        setSport(athlete.sport);
        setAge(athlete.age);
        setGender(athlete.gender);
    }, [athlete]);

    if (!athlete) {
        return <div className="text-white text-center text-2xl">Athlete not found</div>;
    }

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError(null);

        if (!name.trim() || !sport.trim()) {
            setError('Name and sport are required.');
            return;
        }

        if (!Number.isFinite(age) || age < 1) {
            setError('Age must be a valid number greater than 0.');
            return;
        }

        setIsSaving(true);

        try {
            await updateAthleteProfile({
                athleteId: athlete.id,
                name: name.trim(),
                sport: sport.trim(),
                age,
                gender,
            });
            navigate(`/athlete/${athlete.id}`);
        } catch (submitError) {
            setError(submitError instanceof Error ? submitError.message : 'Failed to save athlete profile.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto">
            <GlassCard>
                <div className="space-y-6">
                    <div>
                        <h1 className="text-3xl font-bold text-white">Edit Athlete Profile</h1>
                        <p className="text-stone-400">Update basic athlete information.</p>
                    </div>

                    {error ? (
                        <div className="rounded-lg border border-risk-high/40 bg-risk-high/10 px-3 py-2 text-sm text-red-200">
                            {error}
                        </div>
                    ) : null}

                    <form className="space-y-4" onSubmit={handleSubmit}>
                        <div>
                            <label className="block text-sm text-stone-300 mb-2">Athlete ID</label>
                            <input
                                value={athlete.id}
                                disabled
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-stone-400"
                            />
                        </div>

                        <div>
                            <label className="block text-sm text-stone-300 mb-2">Name</label>
                            <input
                                value={name}
                                onChange={(event) => setName(event.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white"
                            />
                        </div>

                        <div>
                            <label className="block text-sm text-stone-300 mb-2">Sport</label>
                            <input
                                value={sport}
                                onChange={(event) => setSport(event.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm text-stone-300 mb-2">Age</label>
                                <input
                                    type="number"
                                    min={1}
                                    value={age}
                                    onChange={(event) => setAge(Number(event.target.value))}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white"
                                />
                            </div>

                            <div>
                                <label className="block text-sm text-stone-300 mb-2">Gender</label>
                                <select
                                    value={gender}
                                    onChange={(event) => setGender(event.target.value as Athlete['gender'])}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white"
                                >
                                    <option className="bg-zinc-900" value="Male">Male</option>
                                    <option className="bg-zinc-900" value="Female">Female</option>
                                    <option className="bg-zinc-900" value="Other">Other</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-3 pt-2">
                            <Link to={`/athlete/${athlete.id}`}>
                                <GlassButton type="button" variant="secondary">Cancel</GlassButton>
                            </Link>
                            <GlassButton type="submit" disabled={isSaving}>{isSaving ? 'Saving...' : 'Save Changes'}</GlassButton>
                        </div>
                    </form>
                </div>
            </GlassCard>
        </div>
    );
}
