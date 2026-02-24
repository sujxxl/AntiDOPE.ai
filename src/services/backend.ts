const API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.trim() || 'https://antidope-ai.onrender.com';

export type BackendAnalysisResponse = {
    athlete_id: string;
    efficiency_index: number;
    recovery_score: number;
    consistency_score: number;
    final_risk_score: number;
    risk_level: 'Low' | 'Moderate' | 'High';
    confidence: number;
    trend_component: number;
    anomaly_component: number;
    module_details?: {
        consistency?: {
            session_feature_vector?: number[];
        };
    };
    session_summary?: {
        original_samples?: number;
        resampled_samples?: number;
        duration_seconds?: number;
    };
};

export async function analyzeDatasetFile(file: File): Promise<BackendAnalysisResponse> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_URL}/analyze`, {
        method: 'POST',
        body: formData,
    });

    const payload = (await response.json()) as BackendAnalysisResponse | { detail?: string };

    if (!response.ok) {
        throw new Error((payload as { detail?: string }).detail || 'Backend analysis request failed.');
    }

    return payload as BackendAnalysisResponse;
}
