export type RiskLevel = 'Low' | 'Moderate' | 'High';

export interface UploadSession {
    sessionId: string;
    uploadDate: string;
    fileName: string;
    rowCount: number;
    columns: string[];
    validation: {
        validRows: number;
        invalidRows: number;
    };
    inferenceTimestamp: string;
    confidence: number;
    modelOutputs: {
        efficiencyIndex: number;
        recoveryPattern: number;
        consistencyMonitoring: number;
        consistencySignals?: {
            speedMetric: string;
            timeMetric: string;
            humanLimit: number;
            fatigueVariance: number;
            abnormalConsistency: number;
        };
        compositeRiskAssessment: {
            score: number;
            level: RiskLevel;
        };
        dataMetrics?: {
            metric: string;
            unit: string;
            mean: number;
            min: number;
            max: number;
        }[];
        hrAccelerationTrend: { name: string; hr: number; acceleration: number }[];
        anomalyVisualization: { feature: string; impact: number }[];
    };
}

export interface Athlete {
    id: string;
    name: string;
    sport: string;
    age: number;
    gender: 'Male' | 'Female' | 'Other';
    joinedDate: string;
    baselineMetrics?: {
        restingHr?: number;
        baselineHgb?: number;
        baselineRetPct?: number;
    };
    lastInference: {
        timestamp: string;
        confidence: number;
    };
    models: {
        linearRegression: {
            prediction: number;
            deviation: number;
            data: { name: string; actual: number; predicted: number; baseline: number }[];
        };
        isolationForest: {
            anomalyScore: number;
            outlierProbability: number;
            featureImpact: { feature: string; impact: number }[];
        };
        compositeRisk: {
            score: number;
            level: RiskLevel;
            contributions: {
                trend: number;
                anomaly: number;
            };
        };
    };
    historicalData: {
        uploadDate: string;
        fileName: string;
        riskScore: number;
    }[];
    riskProgression: {
        date: string;
        score: number;
    }[];
    uploadSessions: UploadSession[];
}

const seedAthletes: Athlete[] = [
    {
        id: '4829',
        name: 'Elena Petrova',
        sport: 'Athletics - 800m',
        age: 26,
        gender: 'Female',
        joinedDate: '2020-01-10',
        baselineMetrics: {
            restingHr: 50,
            baselineHgb: 14.4,
            baselineRetPct: 1.2,
        },
        lastInference: {
            timestamp: '2023-10-27T10:30:00Z',
            confidence: 0.92,
        },
        models: {
            linearRegression: {
                prediction: 16.5,
                deviation: 1.8,
                data: [
                    { name: 'Jan', actual: 14.5, predicted: 14.6, baseline: 14.4 },
                    { name: 'Mar', actual: 15.2, predicted: 15.1, baseline: 14.6 },
                    { name: 'May', actual: 15.5, predicted: 15.4, baseline: 14.8 },
                    { name: 'Jul', actual: 16.2, predicted: 15.9, baseline: 15.0 },
                    { name: 'Sep', actual: 16.8, predicted: 16.5, baseline: 15.2 },
                ],
            },
            isolationForest: {
                anomalyScore: 0.78,
                outlierProbability: 0.85,
                featureImpact: [
                    { feature: 'Human Limit', impact: 0.45 },
                    { feature: 'Fatigue Variance', impact: 0.3 },
                    { feature: 'Abnormal Consistency', impact: 0.25 },
                ],
            },
            compositeRisk: {
                score: 89,
                level: 'High',
                contributions: {
                    trend: 0.6,
                    anomaly: 0.4,
                },
            },
        },
        historicalData: [
            { uploadDate: '2023-10-27', fileName: 'Q4_2023_data.csv', riskScore: 89 },
            { uploadDate: '2023-07-15', fileName: 'Q3_2023_data.csv', riskScore: 75 },
            { uploadDate: '2023-04-12', fileName: 'Q2_2023_data.csv', riskScore: 60 },
        ],
        riskProgression: [
            { date: '2023-04-12', score: 60 },
            { date: '2023-07-15', score: 75 },
            { date: '2023-10-27', score: 89 },
        ],
        uploadSessions: [
            {
                sessionId: 'SES-4829-20231027',
                uploadDate: '2023-10-27',
                fileName: 'Q4_2023_data.csv',
                rowCount: 185,
                columns: ['Date', 'HR', 'Acceleration', 'HGB'],
                validation: {
                    validRows: 183,
                    invalidRows: 2,
                },
                inferenceTimestamp: '2023-10-27T10:30:00Z',
                confidence: 0.92,
                modelOutputs: {
                    efficiencyIndex: 78,
                    recoveryPattern: 74,
                    consistencyMonitoring: 62,
                    consistencySignals: {
                        speedMetric: 'Acceleration',
                        timeMetric: 'Date',
                        humanLimit: 74,
                        fatigueVariance: 18,
                        abnormalConsistency: 62,
                    },
                    compositeRiskAssessment: {
                        score: 89,
                        level: 'High',
                    },
                    hrAccelerationTrend: [
                        { name: 'W1', hr: 132, acceleration: 3.1 },
                        { name: 'W2', hr: 136, acceleration: 3.0 },
                        { name: 'W3', hr: 141, acceleration: 2.8 },
                        { name: 'W4', hr: 145, acceleration: 2.7 },
                        { name: 'W5', hr: 149, acceleration: 2.5 },
                    ],
                    anomalyVisualization: [
                        { feature: 'Human Limit (Acceleration)', impact: 0.45 },
                        { feature: 'Fatigue Variance (Date)', impact: 0.3 },
                        { feature: 'Abnormal Consistency', impact: 0.25 },
                    ],
                },
            },
        ],
    },
    {
        id: '8812',
        name: 'Marcus Johnson',
        sport: 'Athletics - Decathlon',
        age: 29,
        gender: 'Male',
        joinedDate: '2019-05-20',
        baselineMetrics: {
            restingHr: 53,
            baselineHgb: 14.1,
            baselineRetPct: 1.0,
        },
        lastInference: {
            timestamp: '2023-10-26T14:00:00Z',
            confidence: 0.88,
        },
        models: {
            linearRegression: {
                prediction: 15.2,
                deviation: 0.4,
                data: [
                    { name: 'Jan', actual: 14.2, predicted: 14.3, baseline: 14.1 },
                    { name: 'Mar', actual: 14.5, predicted: 14.6, baseline: 14.3 },
                    { name: 'May', actual: 15.0, predicted: 14.9, baseline: 14.5 },
                    { name: 'Jul', actual: 15.1, predicted: 15.1, baseline: 14.7 },
                ],
            },
            isolationForest: {
                anomalyScore: 0.55,
                outlierProbability: 0.6,
                featureImpact: [
                    { feature: 'Human Limit', impact: 0.5 },
                    { feature: 'Fatigue Variance', impact: 0.25 },
                    { feature: 'Abnormal Consistency', impact: 0.25 },
                ],
            },
            compositeRisk: {
                score: 68,
                level: 'Moderate',
                contributions: {
                    trend: 0.4,
                    anomaly: 0.6,
                },
            },
        },
        historicalData: [
            { uploadDate: '2023-10-26', fileName: 'decathlon_oct23.csv', riskScore: 68 },
            { uploadDate: '2023-06-20', fileName: 'decathlon_jun23.csv', riskScore: 62 },
        ],
        riskProgression: [
            { date: '2023-06-20', score: 62 },
            { date: '2023-10-26', score: 68 },
        ],
        uploadSessions: [
            {
                sessionId: 'SES-8812-20231026',
                uploadDate: '2023-10-26',
                fileName: 'decathlon_oct23.csv',
                rowCount: 143,
                columns: ['Date', 'HR', 'Acceleration', 'RET%'],
                validation: {
                    validRows: 141,
                    invalidRows: 2,
                },
                inferenceTimestamp: '2023-10-26T14:00:00Z',
                confidence: 0.88,
                modelOutputs: {
                    efficiencyIndex: 71,
                    recoveryPattern: 67,
                    consistencyMonitoring: 70,
                    consistencySignals: {
                        speedMetric: 'Acceleration',
                        timeMetric: 'Date',
                        humanLimit: 79,
                        fatigueVariance: 12,
                        abnormalConsistency: 70,
                    },
                    compositeRiskAssessment: {
                        score: 68,
                        level: 'Moderate',
                    },
                    hrAccelerationTrend: [
                        { name: 'W1', hr: 128, acceleration: 3.4 },
                        { name: 'W2', hr: 127, acceleration: 3.5 },
                        { name: 'W3', hr: 129, acceleration: 3.4 },
                        { name: 'W4', hr: 131, acceleration: 3.3 },
                        { name: 'W5', hr: 133, acceleration: 3.2 },
                    ],
                    anomalyVisualization: [
                        { feature: 'Human Limit (Acceleration)', impact: 0.5 },
                        { feature: 'Fatigue Variance (Date)', impact: 0.25 },
                        { feature: 'Abnormal Consistency', impact: 0.25 },
                    ],
                },
            },
        ],
    },
];

export const athletes: Athlete[] = seedAthletes;
