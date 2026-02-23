import { useEffect, useMemo, useState } from 'react';
import { Athlete } from '../data/athletes';
import {
    attachUploadToAthlete,
    createAthlete,
    generateAthleteId,
    getAthletes,
    subscribeAthletes,
} from '../data/athleteStore';

export function useAthletes() {
    const [athletes, setAthletes] = useState<Athlete[]>(() => getAthletes());

    useEffect(() => {
        return subscribeAthletes(() => {
            setAthletes(getAthletes());
        });
    }, []);

    const actions = useMemo(
        () => ({
            refresh: () => setAthletes(getAthletes()),
            createAthlete,
            generateAthleteId,
            attachUploadToAthlete,
        }),
        []
    );

    return {
        athletes,
        ...actions,
    };
}
