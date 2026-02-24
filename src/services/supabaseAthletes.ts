import type { Athlete, RiskLevel, UploadSession } from '../data/athletes';
import { hasSupabaseConfig, supabase } from '../lib/supabase';

type AthleteRow = {
    id: string;
    name: string;
    sport: string | null;
    age: number | null;
    gender: Athlete['gender'] | null;
    created_at: string;
};

type ReportRow = {
    id: string;
    athlete_id: string;
    efficiency_score: number | null;
    recovery_score: number | null;
    consistency_score: number | null;
    final_risk_score: number | null;
    risk_level: RiskLevel | null;
    confidence: number | null;
    feature_snapshot: Record<string, unknown> | null;
    created_at: string;
};

const levelFromScore = (score: number): RiskLevel => {
    if (score >= 80) {
        return 'High';
    }
    if (score >= 55) {
        return 'Moderate';
    }
    return 'Low';
};

const normalizeConfidence = (value: number | null | undefined) => {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
        return 0;
    }
    return value > 1 ? value / 100 : value;
};

const asObject = (value: unknown): Record<string, unknown> =>
    value && typeof value === 'object' ? (value as Record<string, unknown>) : {};

const asArray = <T>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);

function mapReportToUploadSession(row: ReportRow): UploadSession {
    const snapshot = asObject(row.feature_snapshot);
    const validation = asObject(snapshot.validation);
    const consistencySignals = asObject(snapshot.consistency_signals);

    return {
        sessionId: row.id,
        uploadDate: row.created_at.split('T')[0],
        fileName: String(snapshot.file_name ?? `report-${row.id}.csv`),
        rowCount: Number(snapshot.row_count ?? 0),
        columns: asArray<string>(snapshot.columns),
        validation: {
            validRows: Number(validation.validRows ?? 0),
            invalidRows: Number(validation.invalidRows ?? 0),
        },
        inferenceTimestamp: String(snapshot.inference_timestamp ?? row.created_at),
        confidence: normalizeConfidence(row.confidence),
        modelOutputs: {
            efficiencyIndex: Number(row.efficiency_score ?? 0),
            recoveryPattern: Number(row.recovery_score ?? 0),
            consistencyMonitoring: Number(row.consistency_score ?? 0),
            consistencySignals: {
                speedMetric: String(consistencySignals.speedMetric ?? 'Speed'),
                timeMetric: String(consistencySignals.timeMetric ?? 'Time'),
                humanLimit: Number(consistencySignals.humanLimit ?? 0),
                fatigueVariance: Number(consistencySignals.fatigueVariance ?? 0),
                abnormalConsistency: Number(consistencySignals.abnormalConsistency ?? 0),
            },
            compositeRiskAssessment: {
                score: Number(row.final_risk_score ?? 0),
                level: (row.risk_level ?? levelFromScore(Number(row.final_risk_score ?? 0))) as RiskLevel,
            },
            dataMetrics: asArray<{ metric: string; unit: string; mean: number; min: number; max: number }>(snapshot.data_metrics),
            hrAccelerationTrend: asArray<{ name: string; hr: number; acceleration: number }>(snapshot.hr_acceleration_trend),
            anomalyVisualization: asArray<{ feature: string; impact: number }>(snapshot.anomaly_visualization),
        },
    };
}

function mapAthleteRows(athleteRows: AthleteRow[], reportRows: ReportRow[]): Athlete[] {
    const reportsByAthlete = new Map<string, ReportRow[]>();

    for (const report of reportRows) {
        const list = reportsByAthlete.get(report.athlete_id) ?? [];
        list.push(report);
        reportsByAthlete.set(report.athlete_id, list);
    }

    return athleteRows.map((row) => {
        const athleteReports = (reportsByAthlete.get(row.id) ?? []).sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        const uploadSessions = athleteReports.map(mapReportToUploadSession);
        const latestSession = uploadSessions[0];
        const latestScore = latestSession?.modelOutputs.compositeRiskAssessment.score ?? 0;
        const latestLevel = latestSession?.modelOutputs.compositeRiskAssessment.level ?? 'Low';

        return {
            id: row.id,
            name: row.name,
            sport: row.sport ?? 'Unknown Sport',
            age: row.age ?? 0,
            gender: (row.gender ?? 'Other') as Athlete['gender'],
            joinedDate: row.created_at.split('T')[0],
            baselineMetrics: undefined,
            lastInference: {
                timestamp: latestSession?.inferenceTimestamp ?? row.created_at,
                confidence: latestSession?.confidence ?? 0,
            },
            models: {
                linearRegression: {
                    prediction: Number((latestSession?.modelOutputs.efficiencyIndex ?? 0).toFixed(1)),
                    deviation: 0,
                    data: [],
                },
                isolationForest: {
                    anomalyScore: Number(((latestSession?.modelOutputs.consistencyMonitoring ?? 0) / 100).toFixed(2)),
                    outlierProbability: Number(((latestSession?.modelOutputs.consistencyMonitoring ?? 0) / 100).toFixed(2)),
                    featureImpact: latestSession?.modelOutputs.anomalyVisualization ?? [],
                },
                compositeRisk: {
                    score: latestScore,
                    level: latestLevel,
                    contributions: {
                        trend: Number((((latestSession?.modelOutputs.efficiencyIndex ?? 0) + (latestSession?.modelOutputs.recoveryPattern ?? 0)) / 200).toFixed(2)),
                        anomaly: Number((((latestSession?.modelOutputs.consistencyMonitoring ?? 0) / 100)).toFixed(2)),
                    },
                },
            },
            historicalData: athleteReports.map((report) => ({
                uploadDate: report.created_at.split('T')[0],
                fileName: String(asObject(report.feature_snapshot).file_name ?? `report-${report.id}.csv`),
                riskScore: Number(report.final_risk_score ?? 0),
            })),
            riskProgression: athleteReports
                .slice()
                .reverse()
                .map((report) => ({
                    date: report.created_at.split('T')[0],
                    score: Number(report.final_risk_score ?? 0),
                })),
            uploadSessions,
        };
    });
}

export async function fetchAthletesFromSupabase(): Promise<Athlete[]> {
    if (!hasSupabaseConfig || !supabase) {
        return [];
    }

    const { data: athletesData, error: athletesError } = await supabase
        .from('athletes')
        .select('id, name, sport, age, gender, created_at')
        .order('created_at', { ascending: false });

    if (athletesError) {
        throw new Error(`Failed to load athletes: ${athletesError.message}`);
    }

    const { data: reportsData, error: reportsError } = await supabase
        .from('reports')
        .select('id, athlete_id, efficiency_score, recovery_score, consistency_score, final_risk_score, risk_level, confidence, feature_snapshot, created_at')
        .order('created_at', { ascending: false });

    if (reportsError) {
        throw new Error(`Failed to load reports: ${reportsError.message}`);
    }

    return mapAthleteRows((athletesData ?? []) as AthleteRow[], (reportsData ?? []) as ReportRow[]);
}

export async function createAthleteInSupabase(input: {
    id: string;
    name: string;
    sport: string;
    age: number;
    gender: Athlete['gender'];
}) {
    if (!hasSupabaseConfig || !supabase) {
        throw new Error('Supabase is not configured.');
    }

    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;

    if (!user) {
        throw new Error('No authenticated user found.');
    }

    const { error } = await supabase
        .from('athletes')
        .insert({
            id: input.id,
            user_id: user.id,
            name: input.name,
            sport: input.sport,
            age: input.age,
            gender: input.gender,
        });

    if (error) {
        throw new Error(`Failed to create athlete: ${error.message}`);
    }
}
