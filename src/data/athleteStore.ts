import { Athlete, RiskLevel, UploadSession, athletes as seedAthletes } from './athletes';

const STORAGE_KEY = 'antidope-athletes-v1';
const ATHLETES_EVENT = 'antidope-athletes-updated';

const levelFromScore = (score: number): RiskLevel => {
    if (score >= 80) {
        return 'High';
    }

    if (score >= 55) {
        return 'Moderate';
    }

    return 'Low';
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const deepClone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const persistAthletes = (athletes: Athlete[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(athletes));
    window.dispatchEvent(new Event(ATHLETES_EVENT));
};

export const getAthletes = (): Athlete[] => {
    const stored = localStorage.getItem(STORAGE_KEY);

    if (!stored) {
        const seeded = deepClone(seedAthletes);
        persistAthletes(seeded);
        return seeded;
    }

    try {
        const parsed = JSON.parse(stored) as Athlete[];
        return parsed;
    } catch {
        const seeded = deepClone(seedAthletes);
        persistAthletes(seeded);
        return seeded;
    }
};

export const subscribeAthletes = (onChange: () => void) => {
    const handler = () => onChange();
    window.addEventListener(ATHLETES_EVENT, handler);
    window.addEventListener('storage', handler);

    return () => {
        window.removeEventListener(ATHLETES_EVENT, handler);
        window.removeEventListener('storage', handler);
    };
};

export const createAthlete = (input: {
    name: string;
    id: string;
    age: number;
    sport: string;
    gender: Athlete['gender'];
    baselineMetrics?: Athlete['baselineMetrics'];
}): Athlete => {
    const current = getAthletes();

    const newAthlete: Athlete = {
        id: input.id,
        name: input.name,
        sport: input.sport,
        age: input.age,
        gender: input.gender,
        joinedDate: new Date().toISOString().split('T')[0],
        baselineMetrics: input.baselineMetrics,
        lastInference: {
            timestamp: new Date().toISOString(),
            confidence: 0,
        },
        models: {
            linearRegression: {
                prediction: 0,
                deviation: 0,
                data: [],
            },
            isolationForest: {
                anomalyScore: 0,
                outlierProbability: 0,
                featureImpact: [],
            },
            compositeRisk: {
                score: 0,
                level: 'Low',
                contributions: {
                    trend: 0,
                    anomaly: 0,
                },
            },
        },
        historicalData: [],
        riskProgression: [],
        uploadSessions: [],
    };

    const updated = [newAthlete, ...current];
    persistAthletes(updated);
    return newAthlete;
};

export const generateAthleteId = () => `A-${Math.floor(100000 + Math.random() * 900000)}`;

const buildInferenceFromDataset = (rows: Record<string, unknown>[]) => {
    const numericValues = rows.flatMap((row) =>
        Object.values(row)
            .map((value) => (typeof value === 'number' ? value : Number(value)))
            .filter((value) => Number.isFinite(value))
    );

    const avg = numericValues.length > 0
        ? numericValues.reduce((acc, current) => acc + current, 0) / numericValues.length
        : 50;

    const score = clamp(Math.round(40 + avg * 0.7), 15, 98);
    const level = levelFromScore(score);
    const confidence = clamp(0.7 + Math.min(rows.length, 200) / 1000, 0.72, 0.98);

    const hrAccelerationTrend = Array.from({ length: 6 }).map((_, index) => ({
        name: `T${index + 1}`,
        hr: Math.round(clamp(120 + index * 3 + avg * 0.1, 95, 190)),
        acceleration: Number(clamp(3.9 - index * 0.2 + avg * 0.003, 1.5, 5).toFixed(2)),
    }));

    const anomalyVisualization = [
        { feature: 'HGB', impact: Number(clamp(0.2 + score / 250, 0.1, 0.7).toFixed(2)) },
        { feature: 'RET%', impact: Number(clamp(0.15 + score / 300, 0.08, 0.6).toFixed(2)) },
        { feature: 'OFF-Score', impact: Number(clamp(0.15 + score / 320, 0.05, 0.55).toFixed(2)) },
    ];

    return {
        score,
        level,
        confidence,
        efficiencyIndex: clamp(Math.round(45 + score * 0.5), 0, 100),
        recoveryPattern: clamp(Math.round(38 + score * 0.45), 0, 100),
        consistencyMonitoring: clamp(Math.round(55 + (100 - score) * 0.35), 0, 100),
        hrAccelerationTrend,
        anomalyVisualization,
    };
};

export const attachUploadToAthlete = (input: {
    athleteId: string;
    fileName: string;
    rowCount: number;
    columns: string[];
    validRows: number;
    invalidRows: number;
    parsedRows: Record<string, unknown>[];
}): { athlete: Athlete; session: UploadSession } => {
    const current = getAthletes();
    const nowIso = new Date().toISOString();
    const nowDate = nowIso.split('T')[0];

    const inference = buildInferenceFromDataset(input.parsedRows);

    const session: UploadSession = {
        sessionId: `SES-${input.athleteId}-${Date.now()}`,
        uploadDate: nowDate,
        fileName: input.fileName,
        rowCount: input.rowCount,
        columns: input.columns,
        validation: {
            validRows: input.validRows,
            invalidRows: input.invalidRows,
        },
        inferenceTimestamp: nowIso,
        confidence: inference.confidence,
        modelOutputs: {
            efficiencyIndex: inference.efficiencyIndex,
            recoveryPattern: inference.recoveryPattern,
            consistencyMonitoring: inference.consistencyMonitoring,
            compositeRiskAssessment: {
                score: inference.score,
                level: inference.level,
            },
            hrAccelerationTrend: inference.hrAccelerationTrend,
            anomalyVisualization: inference.anomalyVisualization,
        },
    };

    let updatedAthlete: Athlete | null = null;

    const updated = current.map((athlete) => {
        if (athlete.id !== input.athleteId) {
            return athlete;
        }

        const updatedRiskProgression = [
            ...athlete.riskProgression,
            {
                date: nowDate,
                score: inference.score,
            },
        ];

        const linearData = [
            ...athlete.models.linearRegression.data.slice(-5),
            {
                name: new Date(nowIso).toLocaleDateString('en-US', { month: 'short' }),
                actual: Number((inference.score / 6).toFixed(1)),
                predicted: Number((inference.score / 6.5).toFixed(1)),
                baseline: Number((inference.score / 7).toFixed(1)),
            },
        ];

        const nextAthlete: Athlete = {
            ...athlete,
            lastInference: {
                timestamp: nowIso,
                confidence: inference.confidence,
            },
            models: {
                linearRegression: {
                    prediction: Number((inference.score / 6.5).toFixed(1)),
                    deviation: Number(Math.abs(inference.score / 6 - inference.score / 6.5).toFixed(2)),
                    data: linearData,
                },
                isolationForest: {
                    anomalyScore: Number((inference.score / 100).toFixed(2)),
                    outlierProbability: Number((inference.score / 100).toFixed(2)),
                    featureImpact: inference.anomalyVisualization,
                },
                compositeRisk: {
                    score: inference.score,
                    level: inference.level,
                    contributions: {
                        trend: Number((inference.efficiencyIndex / 100).toFixed(2)),
                        anomaly: Number((1 - inference.efficiencyIndex / 100).toFixed(2)),
                    },
                },
            },
            historicalData: [
                {
                    uploadDate: nowDate,
                    fileName: input.fileName,
                    riskScore: inference.score,
                },
                ...athlete.historicalData,
            ],
            riskProgression: updatedRiskProgression,
            uploadSessions: [session, ...athlete.uploadSessions],
        };

        updatedAthlete = nextAthlete;
        return nextAthlete;
    });

    if (!updatedAthlete) {
        throw new Error('Athlete not found while attaching upload.');
    }

    persistAthletes(updated);
    return {
        athlete: updatedAthlete,
        session,
    };
};
