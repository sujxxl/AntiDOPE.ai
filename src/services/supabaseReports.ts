import { Athlete, UploadSession } from '../data/athletes';
import { hasSupabaseConfig, supabase } from '../lib/supabase';

export async function saveAthleteAndReport(params: {
    athlete: Athlete;
    session: UploadSession;
}) {
    if (!hasSupabaseConfig || !supabase) {
        return;
    }

    const { athlete, session } = params;

    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;

    if (!user) {
        return;
    }

    const athleteRow = {
        id: athlete.id,
        user_id: user.id,
        name: athlete.name,
        sport: athlete.sport,
        age: athlete.age,
        gender: athlete.gender,
    };

    const { error: athleteError } = await supabase
        .from('athletes')
        .upsert(athleteRow, { onConflict: 'id' });

    if (athleteError) {
        throw new Error(`Failed to save athlete: ${athleteError.message}`);
    }

    const reportRow = {
        athlete_id: athlete.id,
        user_id: user.id,
        efficiency_score: session.modelOutputs.efficiencyIndex,
        recovery_score: session.modelOutputs.recoveryPattern,
        consistency_score: session.modelOutputs.consistencyMonitoring,
        final_risk_score: session.modelOutputs.compositeRiskAssessment.score,
        risk_level: session.modelOutputs.compositeRiskAssessment.level,
        confidence: session.confidence,
        feature_snapshot: {
            file_name: session.fileName,
            columns: session.columns,
            validation: session.validation,
            data_metrics: session.modelOutputs.dataMetrics ?? [],
            consistency_signals: session.modelOutputs.consistencySignals ?? null,
            anomaly_visualization: session.modelOutputs.anomalyVisualization,
            session_summary: {
                row_count: session.rowCount,
                inference_timestamp: session.inferenceTimestamp,
            },
        },
    };

    const { error: reportError } = await supabase
        .from('reports')
        .insert(reportRow);

    if (reportError) {
        throw new Error(`Failed to save report: ${reportError.message}`);
    }
}
