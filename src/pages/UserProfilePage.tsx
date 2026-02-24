import { FormEvent, useEffect, useState } from 'react';
import GlassCard from '../components/GlassCard';
import GlassButton from '../components/GlassButton';
import { hasSupabaseConfig, supabase } from '../lib/supabase';
import { getUserProfileFromSupabase, updateUserProfileInSupabase } from '../services/supabaseProfiles';

type LocalProfile = {
    fullName: string;
    role: string;
};

const STORAGE_KEY = 'antidope-user-profile-v1';

const readLocalProfile = (): LocalProfile => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) {
            return { fullName: '', role: '' };
        }
        return JSON.parse(raw) as LocalProfile;
    } catch {
        return { fullName: '', role: '' };
    }
};

export default function UserProfilePage() {
    const [email, setEmail] = useState('');
    const [fullName, setFullName] = useState('');
    const [role, setRole] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const load = async () => {
            if (hasSupabaseConfig && supabase) {
                const profile = await getUserProfileFromSupabase();
                setEmail(profile?.email ?? '');
                setFullName(profile?.fullName ?? '');
                setRole(profile?.role ?? '');
                return;
            }

            const local = readLocalProfile();
            setFullName(local.fullName);
            setRole(local.role);
        };

        load();
    }, []);

    const handleSave = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError(null);
        setMessage(null);

        setIsSaving(true);

        try {
            if (hasSupabaseConfig && supabase) {
                await updateUserProfileInSupabase({
                    fullName: fullName.trim(),
                    role: role.trim(),
                });
            } else {
                localStorage.setItem(
                    STORAGE_KEY,
                    JSON.stringify({ fullName: fullName.trim(), role: role.trim() })
                );
            }

            setMessage('Profile updated successfully.');
        } catch (saveError) {
            setError(saveError instanceof Error ? saveError.message : 'Failed to update profile.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto">
            <GlassCard>
                <div className="space-y-6">
                    <div>
                        <h1 className="text-3xl font-bold text-white">User Profile</h1>
                        <p className="text-stone-400">Edit your basic account details.</p>
                    </div>

                    {message ? (
                        <div className="rounded-lg border border-risk-low/40 bg-risk-low/10 px-3 py-2 text-sm text-green-200">
                            {message}
                        </div>
                    ) : null}

                    {error ? (
                        <div className="rounded-lg border border-risk-high/40 bg-risk-high/10 px-3 py-2 text-sm text-red-200">
                            {error}
                        </div>
                    ) : null}

                    <form className="space-y-4" onSubmit={handleSave}>
                        <div>
                            <label className="block text-sm text-stone-300 mb-2">Email</label>
                            <input
                                value={email}
                                disabled
                                placeholder="Signed-in user email"
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-stone-400"
                            />
                        </div>

                        <div>
                            <label className="block text-sm text-stone-300 mb-2">Full Name</label>
                            <input
                                value={fullName}
                                onChange={(event) => setFullName(event.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white"
                                placeholder="Your full name"
                            />
                        </div>

                        <div>
                            <label className="block text-sm text-stone-300 mb-2">Role</label>
                            <input
                                value={role}
                                onChange={(event) => setRole(event.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white"
                                placeholder="Lead Analyst"
                            />
                        </div>

                        <div className="flex justify-end pt-2">
                            <GlassButton type="submit" disabled={isSaving}>
                                {isSaving ? 'Saving...' : 'Save Profile'}
                            </GlassButton>
                        </div>
                    </form>
                </div>
            </GlassCard>
        </div>
    );
}
