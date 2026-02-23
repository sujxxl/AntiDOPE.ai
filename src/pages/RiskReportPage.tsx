import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import GlassCard from '../components/GlassCard';
import GlassButton from '../components/GlassButton';
import { Printer } from 'lucide-react';
import RiskBadge from '../components/RiskBadge';
import { useAthletes } from '../hooks/useAthletes';

export default function RiskReportPage() {
    const { id } = useParams<{ id: string }>();
    const { athletes } = useAthletes();
    const athlete = athletes.find((a) => a.id === id);

    const latestSession = useMemo(() => {
        if (!athlete) {
            return null;
        }

        return [...athlete.uploadSessions].sort(
            (left, right) =>
                new Date(right.inferenceTimestamp).getTime() - new Date(left.inferenceTimestamp).getTime()
        )[0] ?? null;
    }, [athlete]);

    if (!athlete || !latestSession) {
        return <div className="text-white text-center text-2xl">Athlete report not available</div>;
    }

    const primaryMetric = latestSession.modelOutputs.dataMetrics?.[0];
    const secondaryMetric = latestSession.modelOutputs.dataMetrics?.[1] ?? primaryMetric;
    const consistencySignals = latestSession.modelOutputs.consistencySignals;
    const primaryLabel = primaryMetric ? `${primaryMetric.metric} (${primaryMetric.unit})` : 'Primary Metric';
    const secondaryLabel = secondaryMetric ? `${secondaryMetric.metric} (${secondaryMetric.unit})` : 'Secondary Metric';

    const consistencyChartData = [
        {
            shortFeature: 'Human Limit',
            impact: Number(((consistencySignals?.humanLimit ?? 0) / 100).toFixed(2)),
        },
        {
            shortFeature: 'Fatigue Variance',
            impact: Number(((consistencySignals?.fatigueVariance ?? 0) / 100).toFixed(2)),
        },
        {
            shortFeature: 'Abnormal Consistency',
            impact: Number(((consistencySignals?.abnormalConsistency ?? 0) / 100).toFixed(2)),
        },
    ];

    const weightedData = [
        {
            name: 'Trend Signal',
            value: Number((athlete.models.compositeRisk.contributions.trend * 100).toFixed(0)),
        },
        {
            name: 'Anomaly Signal',
            value: Number((athlete.models.compositeRisk.contributions.anomaly * 100).toFixed(0)),
        },
    ];

    return (
        <div className="printable-area space-y-8 print:text-black">
            <div className="flex items-center justify-between no-print">
                <div>
                    <h1 className="text-4xl font-bold text-glass-white">Professional Risk Report</h1>
                    <p className="text-stone-400">Athlete-specific analysis package for compliance review.</p>
                </div>
                <GlassButton onClick={() => window.print()}>
                    <Printer className="w-4 h-4 mr-2" />
                    Print Report
                </GlassButton>
            </div>

            <section className="report-section relative overflow-hidden">
                <div className="absolute right-4 top-4 text-white/10 text-3xl font-bold tracking-wider print:text-black/20">
                    AntiDOPE.ai
                </div>

                <div className="mb-6 text-sm grid grid-cols-1 md:grid-cols-4 gap-3">
                    <p><span className="text-stone-400">Athlete:</span> <span className="text-white">{athlete.name}</span></p>
                    <p><span className="text-stone-400">Athlete ID:</span> <span className="text-white">{athlete.id}</span></p>
                    <p><span className="text-stone-400">Sport:</span> <span className="text-white">{athlete.sport}</span></p>
                    <p><span className="text-stone-400">Inference:</span> <span className="text-white">{new Date(latestSession.inferenceTimestamp).toLocaleString()}</span></p>
                </div>

                <h2 className="text-2xl font-bold text-glass-white report-header">Core Analysis Summary</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                        <p className="text-sm text-stone-400">Efficiency Index</p>
                        <p className="text-4xl font-bold text-white">{latestSession.modelOutputs.efficiencyIndex}</p>
                        <p className="text-xs text-stone-400 mt-2">Primary trend metric: {primaryLabel}</p>
                        <div className="h-44 mt-3 chart-crisp">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={latestSession.modelOutputs.hrAccelerationTrend}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                                    <XAxis dataKey="name" stroke="#9ca3af" />
                                    <YAxis yAxisId="left" stroke="#9ca3af" />
                                    <YAxis yAxisId="right" orientation="right" stroke="#9ca3af" />
                                    <Tooltip />
                                    <Line yAxisId="left" type="monotone" dataKey="hr" stroke="#00FFAB" strokeWidth={2} name={primaryLabel} dot={false} />
                                    <Line yAxisId="right" type="monotone" dataKey="acceleration" stroke="#FFD24D" strokeWidth={2} name={secondaryLabel} dot={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                        <p className="text-sm text-stone-400">Consistency Monitoring</p>
                        <p className="text-4xl font-bold text-white">{latestSession.modelOutputs.consistencyMonitoring}</p>
                        <p className="text-xs text-stone-400 mt-2">
                            Sprint anomaly from {consistencySignals?.speedMetric ?? 'speed'} and {consistencySignals?.timeMetric ?? 'timestamp'}
                        </p>
                        <div className="mt-2 space-y-1 text-xs text-stone-300">
                            <p>Human Limit: <span className="text-white font-semibold">{consistencySignals?.humanLimit ?? '--'}%</span></p>
                            <p>Fatigue Variance: <span className="text-white font-semibold">{consistencySignals?.fatigueVariance ?? '--'}%</span></p>
                            <p>Abnormal Consistency: <span className="text-white font-semibold">{consistencySignals?.abnormalConsistency ?? '--'}%</span></p>
                        </div>
                        <div className="h-44 mt-3 chart-crisp">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={consistencyChartData} layout="vertical" margin={{ top: 6, right: 8, left: 8, bottom: 6 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                                    <XAxis type="number" stroke="#9ca3af" domain={[0, 1]} tickFormatter={(value) => Number(value).toFixed(2)} />
                                    <YAxis type="category" dataKey="shortFeature" stroke="#9ca3af" width={120} tick={{ fontSize: 11 }} />
                                    <Tooltip />
                                    <Bar dataKey="impact" fill="#FFD24D" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                        <p className="text-sm text-stone-400">Recovery Pattern Analysis</p>
                        <p className="text-4xl font-bold text-white">{latestSession.modelOutputs.recoveryPattern}</p>
                        <p className="text-xs text-stone-400 mt-2">Secondary trend metric: {secondaryLabel}</p>
                        <div className="h-44 mt-3 chart-crisp">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={athlete.models.linearRegression.data}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                                    <XAxis dataKey="name" stroke="#9ca3af" />
                                    <YAxis stroke="#9ca3af" />
                                    <Tooltip />
                                    <Line type="monotone" dataKey="actual" stroke="#00FFAB" strokeWidth={2} name="Observed" dot={false} />
                                    <Line type="monotone" dataKey="predicted" stroke="#FFD24D" strokeWidth={2} name="Expected" dot={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                <div className="mt-6 rounded-xl border border-white/10 bg-white/5 p-5">
                    <h3 className="text-lg font-semibold text-white mb-3">Summarized Weighted Result</h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                        <div>
                            <p className="text-xs text-stone-400 uppercase tracking-wide">Final Risk Score</p>
                            <p className="text-5xl font-bold text-risk-high print:text-black leading-none">{latestSession.modelOutputs.compositeRiskAssessment.score}</p>
                        </div>
                        <div>
                            <p className="text-xs text-stone-400 uppercase tracking-wide mb-2">Risk Level</p>
                            <RiskBadge level={latestSession.modelOutputs.compositeRiskAssessment.level} />
                        </div>
                        <div>
                            <p className="text-xs text-stone-400 uppercase tracking-wide">Confidence</p>
                            <p className="text-3xl font-bold text-white print:text-black">{(latestSession.confidence * 100).toFixed(0)}%</p>
                        </div>
                        <div>
                            <p className="text-xs text-stone-400 uppercase tracking-wide">Weighted Split</p>
                            <div className="flex gap-4 mt-1">
                                <p className="text-sm text-stone-300">Trend <span className="text-white font-semibold">{(athlete.models.compositeRisk.contributions.trend * 100).toFixed(0)}%</span></p>
                                <p className="text-sm text-stone-300">Anomaly <span className="text-white font-semibold">{(athlete.models.compositeRisk.contributions.anomaly * 100).toFixed(0)}%</span></p>
                            </div>
                        </div>
                    </div>
                    <div className="h-48 mt-4 chart-crisp">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={weightedData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                                <XAxis dataKey="name" stroke="#9ca3af" />
                                <YAxis domain={[0, 100]} stroke="#9ca3af" />
                                <Tooltip />
                                <Bar dataKey="value" fill="#8B5CF6" radius={[6, 6, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </section>

            <GlassCard className="report-section">
                <h2 className="text-2xl font-bold text-glass-white report-header">Uploaded Dataset Metrics</h2>
                <p className="text-stone-400 mb-4">Real metrics extracted from the uploaded session file and used for inference.</p>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-glass-stroke">
                                <th className="p-3 text-sm text-stone-400 uppercase">Metric</th>
                                <th className="p-3 text-sm text-stone-400 uppercase">Unit</th>
                                <th className="p-3 text-sm text-stone-400 uppercase">Mean</th>
                                <th className="p-3 text-sm text-stone-400 uppercase">Min</th>
                                <th className="p-3 text-sm text-stone-400 uppercase">Max</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(latestSession.modelOutputs.dataMetrics ?? []).map((metric) => (
                                <tr key={metric.metric} className="border-b border-glass-stroke/50 last:border-none">
                                    <td className="p-3 text-white">{metric.metric}</td>
                                    <td className="p-3 text-white">{metric.unit}</td>
                                    <td className="p-3 text-white">{metric.mean}</td>
                                    <td className="p-3 text-white">{metric.min}</td>
                                    <td className="p-3 text-white">{metric.max}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </GlassCard>

            <div className="print-footer hidden text-center text-xs text-gray-500 mt-8">
                <p>AntiDOPE.ai | Official Analytical Report | Generated {new Date().toLocaleString()}</p>
            </div>
        </div>
    );
}
