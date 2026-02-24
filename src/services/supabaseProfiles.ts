import type { Athlete } from '../data/athletes';
import { hasSupabaseConfig, supabase } from '../lib/supabase';

export async function updateAthleteProfileInSupabase(params: {
    athlete: Athlete;
}) {
    if (!hasSupabaseConfig || !supabase) {
        return;
    }

    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;

    if (!user) {
        return;
    }

    const { athlete } = params;

    const { error } = await supabase
        .from('athletes')
        .upsert(
            {
                id: athlete.id,
                user_id: user.id,
                name: athlete.name,
                sport: athlete.sport,
                age: athlete.age,
                gender: athlete.gender,
            },
            { onConflict: 'id' }
        );

    if (error) {
        throw new Error(`Failed to update athlete profile: ${error.message}`);
    }
}

export async function getUserProfileFromSupabase() {
    if (!hasSupabaseConfig || !supabase) {
        return null;
    }

    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;

    if (!user) {
        return null;
    }

    const { data, error } = await supabase
        .from('user_profiles')
        .select('full_name, role')
        .eq('user_id', user.id)
        .maybeSingle();

    if (error) {
        throw new Error(`Failed to load user profile: ${error.message}`);
    }

    return {
        email: user.email ?? '',
        fullName: (data?.full_name as string | null) ?? '',
        role: (data?.role as string | null) ?? '',
    };
}

export async function updateUserProfileInSupabase(params: {
    fullName: string;
    role: string;
}) {
    if (!hasSupabaseConfig || !supabase) {
        return;
    }

    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;

    if (!user) {
        return;
    }

    const { fullName, role } = params;

    const { error: profileError } = await supabase
        .from('user_profiles')
        .upsert(
            {
                user_id: user.id,
                full_name: fullName,
                role,
            },
            { onConflict: 'user_id' }
        );

    if (profileError) {
        throw new Error(`Failed to update user profile: ${profileError.message}`);
    }

    const { error: authError } = await supabase.auth.updateUser({
        data: {
            full_name: fullName,
            role,
        },
    });

    if (authError) {
        throw new Error(`Failed to update auth metadata: ${authError.message}`);
    }
}
