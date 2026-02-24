import { useEffect, useMemo, useState } from 'react';
import { Athlete } from '../data/athletes';
import {
    attachUploadToAthlete,
    generateAthleteId,
    setAthletesSnapshot,
    updateAthleteProfile,
} from '../data/athleteStore';
import { createAthleteInSupabase, fetchAthletesFromSupabase } from '../services/supabaseAthletes';
import { saveAthleteAndReport } from '../services/supabaseReports';
import { updateAthleteProfileInSupabase } from '../services/supabaseProfiles';
import { hasSupabaseConfig, supabase } from '../lib/supabase';

export function useAthletes() {
    const [athletes, setAthletes] = useState<Athlete[]>([]);

    useEffect(() => {
        let isMounted = true;

        const load = async () => {
            if (!hasSupabaseConfig || !supabase) {
                if (isMounted) {
                    setAthletes([]);
                }
                return;
            }

            try {
                const data = await fetchAthletesFromSupabase();
                if (isMounted) {
                    setAthletes(data);
                    setAthletesSnapshot(data);
                }
            } catch {
                if (isMounted) {
                    setAthletes([]);
                }
            }
        };

        load();

        const { data: authListener } = supabase
            ? supabase.auth.onAuthStateChange(() => {
                load();
            })
            : { data: { subscription: { unsubscribe: () => undefined } } };

        return () => {
            isMounted = false;
            authListener.subscription.unsubscribe();
        };
    }, []);

    const actions = useMemo(
        () => ({
            refresh: async () => {
                if (!hasSupabaseConfig || !supabase) {
                    setAthletes([]);
                    return;
                }
                const data = await fetchAthletesFromSupabase();
                setAthletes(data);
                setAthletesSnapshot(data);
            },
            createAthlete: async (input: {
                name: string;
                id: string;
                age: number;
                sport: string;
                gender: Athlete['gender'];
                baselineMetrics?: Athlete['baselineMetrics'];
            }) => {
                await createAthleteInSupabase({
                    id: input.id,
                    name: input.name,
                    age: input.age,
                    sport: input.sport,
                    gender: input.gender,
                });
                const data = await fetchAthletesFromSupabase();
                setAthletes(data);
                setAthletesSnapshot(data);
                const created = data.find((athlete) => athlete.id === input.id);
                if (!created) {
                    throw new Error('Created athlete was not returned from Supabase.');
                }
                return created;
            },
            generateAthleteId,
            attachUploadToAthlete: async (input: {
                athleteId: string;
                fileName: string;
                rowCount: number;
                columns: string[];
                validRows: number;
                invalidRows: number;
                parsedRows: Record<string, unknown>[];
                analysisResult?: import('../services/backend').BackendAnalysisResponse;
            }) => {
                const result = attachUploadToAthlete(input);
                await saveAthleteAndReport({
                    athlete: result.athlete,
                    session: result.session,
                });
                const data = await fetchAthletesFromSupabase();
                setAthletes(data);
                setAthletesSnapshot(data);
                const updated = data.find((athlete) => athlete.id === input.athleteId) ?? result.athlete;
                return { athlete: updated, session: result.session };
            },
            updateAthleteProfile: async (input: {
                athleteId: string;
                name: string;
                sport: string;
                age: number;
                gender: Athlete['gender'];
            }) => {
                const updated = updateAthleteProfile(input);
                await updateAthleteProfileInSupabase({ athlete: updated });
                const data = await fetchAthletesFromSupabase();
                setAthletes(data);
                setAthletesSnapshot(data);
                return data.find((athlete) => athlete.id === input.athleteId) ?? updated;
            },
        }),
        []
    );

    return {
        athletes,
        ...actions,
    };
}
