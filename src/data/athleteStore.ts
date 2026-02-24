import { Athlete, RiskLevel, UploadSession, athletes as seedAthletes } from './athletes';
import type { BackendAnalysisResponse } from '../services/backend';

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

const normalizeFeatureLabel = (label: string) => {
    const normalized = label.toLowerCase();

    if (normalized.includes('off-score') || normalized.includes('abnormal consistency')) {
        return 'Abnormal Consistency';
    }

    if (normalized.includes('hgb') || normalized.includes('t/e') || normalized.includes('human limit')) {
        return 'Human Limit';
    }

    if (normalized.includes('ret') || normalized.includes('fatigue variance')) {
        return 'Fatigue Variance';
    }

    return label;
};

const sanitizeAthleteLabels = (athletes: Athlete[]) => {
    return athletes.map((athlete) => ({
        ...athlete,
        models: {
            ...athlete.models,
            isolationForest: {
                ...athlete.models.isolationForest,
                featureImpact: athlete.models.isolationForest.featureImpact.map((item) => ({
                    ...item,
                    feature: normalizeFeatureLabel(item.feature),
                })),
            },
        },
        uploadSessions: athlete.uploadSessions.map((session) => ({
            ...session,
            modelOutputs: {
                ...session.modelOutputs,
                anomalyVisualization: session.modelOutputs.anomalyVisualization.map((item) => ({
                    ...item,
                    feature: normalizeFeatureLabel(item.feature),
                })),
            },
        })),
    }));
};

const persistAthletes = (athletes: Athlete[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(athletes));
    window.dispatchEvent(new Event(ATHLETES_EVENT));
};

export const getAthletes = (): Athlete[] => {
    const stored = localStorage.getItem(STORAGE_KEY);

    if (!stored) {
        const seeded = sanitizeAthleteLabels(deepClone(seedAthletes));
        persistAthletes(seeded);
        return seeded;
    }

    try {
        const parsed = JSON.parse(stored) as Athlete[];
        const sanitized = sanitizeAthleteLabels(parsed);
        persistAthletes(sanitized);
        return sanitized;
    } catch {
        const seeded = sanitizeAthleteLabels(deepClone(seedAthletes));
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

const unitFromColumnName = (column: string) => {
    const normalized = column.toLowerCase();

    if (normalized.includes('%') || normalized.includes('percent')) {
        return '%';
    }

    if (normalized.includes('hr') || normalized.includes('heart')) {
        return 'bpm';
    }

    if (normalized.includes('acc') || normalized.includes('speed')) {
        return 'm/s²';
    }

    if (normalized.includes('temp')) {
        return '°C';
    }

    return 'value';
};

const numericColumnStats = (rows: Record<string, unknown>[], columns: string[]) => {
    return columns
        .map((column) => {
            const values = rows
                .map((row) => {
                    const value = row[column];
                    return typeof value === 'number' ? value : Number(value);
                })
                .filter((value) => Number.isFinite(value));

            if (values.length === 0) {
                return null;
            }

            const mean = values.reduce((acc, value) => acc + value, 0) / values.length;

            return {
                metric: column,
                unit: unitFromColumnName(column),
                mean: Number(mean.toFixed(2)),
                min: Number(Math.min(...values).toFixed(2)),
                max: Number(Math.max(...values).toFixed(2)),
                values,
            };
        })
        .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));
};

const stdDev = (values: number[]) => {
    if (values.length <= 1) {
        return 0;
    }

    const mean = values.reduce((acc, value) => acc + value, 0) / values.length;
    const variance = values.reduce((acc, value) => acc + (value - mean) ** 2, 0) / values.length;
    return Math.sqrt(variance);
};

const pickColumn = (columns: string[], patterns: RegExp[]) => {
    return columns.find((column) => patterns.some((pattern) => pattern.test(column.toLowerCase())));
};

const parseTimeValue = (value: unknown) => {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }

    if (typeof value === 'string') {
        const parsedDate = Date.parse(value);
        if (Number.isFinite(parsedDate)) {
            return parsedDate / 1000;
        }

        const parsedNumber = Number(value);
        if (Number.isFinite(parsedNumber)) {
            return parsedNumber;
        }
    }

    return null;
};

const computeConsistencySignals = (rows: Record<string, unknown>[], columns: string[]) => {
    const speedColumn = pickColumn(columns, [/speed/, /velocity/, /sprint/, /acceleration/, /^acc$/]);
    const timeColumn = pickColumn(columns, [/timestamp/, /time/, /date/]);

    const speedValues = (speedColumn
        ? rows
            .map((row) => {
                const rawValue = row[speedColumn];
                return typeof rawValue === 'number' ? rawValue : Number(rawValue);
            })
            .filter((value) => Number.isFinite(value))
        : []);

    const timeValues = (timeColumn
        ? rows
            .map((row) => parseTimeValue(row[timeColumn]))
            .filter((value): value is number => value !== null)
        : []);

    const maxSpeed = speedValues.length > 0 ? Math.max(...speedValues) : 0;
    const speedStd = stdDev(speedValues);

    const humanLimit = clamp((maxSpeed / 12.5) * 100, 0, 100);

    let fatigueVariance = speedStd;
    if (speedValues.length > 2 && timeValues.length === speedValues.length) {
        const speedDeltas = speedValues.slice(1).map((speed, index) => {
            const dt = Math.max(1, Math.abs(timeValues[index + 1] - timeValues[index]));
            return (speedValues[index] - speed) / dt;
        });
        fatigueVariance = stdDev(speedDeltas) * 25;
    }

    const fatigueVarianceScore = clamp(fatigueVariance * 8, 0, 100);
    const abnormalConsistency = clamp(100 - fatigueVarianceScore + (humanLimit > 85 ? 12 : 0), 0, 100);

    return {
        speedMetric: speedColumn ?? 'Speed',
        timeMetric: timeColumn ?? 'Timestamp',
        humanLimit: Number(humanLimit.toFixed(2)),
        fatigueVariance: Number(fatigueVarianceScore.toFixed(2)),
        abnormalConsistency: Number(abnormalConsistency.toFixed(2)),
    };
};

const buildInferenceFromDataset = (rows: Record<string, unknown>[], columns: string[]) => {
    const stats = numericColumnStats(rows, columns);
    const consistencySignals = computeConsistencySignals(rows, columns);

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

    const primaryMetric = stats[0];
    const secondaryMetric = stats[1] ?? stats[0];

    const hrAccelerationTrend = Array.from({ length: 6 }).map((_, index) => ({
        name: `T${index + 1}`,
        hr: Number(
            clamp(
                primaryMetric?.values[index % primaryMetric.values.length] ?? (120 + index * 3 + avg * 0.1),
                -99999,
                99999
            ).toFixed(2)
        ),
        acceleration: Number(
            clamp(
                secondaryMetric?.values[index % secondaryMetric.values.length] ?? (3.9 - index * 0.2 + avg * 0.003),
                -99999,
                99999
            ).toFixed(2)
        ),
    }));

    const anomalyVisualization = [
        {
            feature: `Human Limit (${consistencySignals.speedMetric})`,
            impact: Number(clamp(consistencySignals.humanLimit / 100, 0.08, 0.95).toFixed(2)),
        },
        {
            feature: `Fatigue Variance (${consistencySignals.timeMetric})`,
            impact: Number(clamp(consistencySignals.fatigueVariance / 100, 0.08, 0.95).toFixed(2)),
        },
        {
            feature: 'Abnormal Consistency',
            impact: Number(clamp(consistencySignals.abnormalConsistency / 100, 0.08, 0.95).toFixed(2)),
        },
    ];

    const anomalyProbability = clamp(consistencySignals.abnormalConsistency / 100, 0.08, 0.98);

    return {
        score,
        level,
        confidence,
        efficiencyIndex: clamp(Math.round(45 + score * 0.5), 0, 100),
        recoveryPattern: clamp(Math.round(38 + score * 0.45), 0, 100),
        consistencyMonitoring: clamp(Math.round(consistencySignals.abnormalConsistency), 0, 100),
        consistencySignals,
        anomalyProbability,
        dataMetrics: stats.map(({ metric, unit, mean, min, max }) => ({ metric, unit, mean, min, max })),
        primaryMetricName: primaryMetric?.metric ?? 'Metric A',
        primaryMetricUnit: primaryMetric?.unit ?? 'value',
        secondaryMetricName: secondaryMetric?.metric ?? 'Metric B',
        secondaryMetricUnit: secondaryMetric?.unit ?? 'value',
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
    analysisResult?: BackendAnalysisResponse;
}): { athlete: Athlete; session: UploadSession } => {
    const current = getAthletes();
    const nowIso = new Date().toISOString();
    const nowDate = nowIso.split('T')[0];

    const localInference = buildInferenceFromDataset(input.parsedRows, input.columns);

    const inference = input.analysisResult
        ? {
            ...localInference,
            score: clamp(Number(input.analysisResult.final_risk_score ?? localInference.score), 0, 100),
            level: (input.analysisResult.risk_level ?? localInference.level) as RiskLevel,
            confidence: clamp(Number(input.analysisResult.confidence ?? localInference.confidence), 0, 1),
            efficiencyIndex: clamp(Number(input.analysisResult.efficiency_index ?? localInference.efficiencyIndex), 0, 100),
            recoveryPattern: clamp(Number(input.analysisResult.recovery_score ?? localInference.recoveryPattern), 0, 100),
            consistencyMonitoring: clamp(Number(input.analysisResult.consistency_score ?? localInference.consistencyMonitoring), 0, 100),
            anomalyProbability: clamp(Number(input.analysisResult.anomaly_component ?? localInference.anomalyProbability * 100) / 100, 0, 1),
        }
        : localInference;

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
            consistencySignals: inference.consistencySignals,
            compositeRiskAssessment: {
                score: inference.score,
                level: inference.level,
            },
            dataMetrics: inference.dataMetrics,
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
                    anomalyScore: Number(inference.anomalyProbability.toFixed(2)),
                    outlierProbability: Number(inference.anomalyProbability.toFixed(2)),
                    featureImpact: inference.anomalyVisualization,
                },
                compositeRisk: {
                    score: inference.score,
                    level: inference.level,
                    contributions: {
                        trend: Number(
                            (
                                input.analysisResult
                                    ? clamp(Number(input.analysisResult.trend_component ?? 0), 0, 100) / 100
                                    : inference.efficiencyIndex / 100
                            ).toFixed(2)
                        ),
                        anomaly: Number(
                            (
                                input.analysisResult
                                    ? clamp(Number(input.analysisResult.anomaly_component ?? 0), 0, 100) / 100
                                    : (1 - inference.efficiencyIndex / 100)
                            ).toFixed(2)
                        ),
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
