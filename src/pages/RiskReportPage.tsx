import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line } from 'recharts';
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                    <div>
                        <h2 className="text-2xl font-bold text-glass-white report-header">Athlete Details</h2>
                        <div className="space-y-2 text-sm">
                            <p><span className="text-stone-400">Name:</span> <span className="text-white">{athlete.name}</span></p>
                            <p><span className="text-stone-400">Athlete ID:</span> <span className="text-white">{athlete.id}</span></p>
                            <p><span className="text-stone-400">Sport:</span> <span className="text-white">{athlete.sport}</span></p>
                            <p><span className="text-stone-400">Inference Timestamp:</span> <span className="text-white">{new Date(latestSession.inferenceTimestamp).toLocaleString()}</span></p>
                        </div>
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-glass-white report-header">Risk Score Summary</h2>
                        <p className="text-6xl font-bold text-risk-high print:text-black leading-none">{latestSession.modelOutputs.compositeRiskAssessment.score}</p>
                        <p className="text-stone-400 mt-2">Composite risk score</p>
                        <div className="mt-3">
                            <RiskBadge level={latestSession.modelOutputs.compositeRiskAssessment.level} />
                        </div>
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-glass-white report-header">Confidence Level</h2>
                        <p className="text-5xl font-bold text-white print:text-black">{(latestSession.confidence * 100).toFixed(0)}%</p>
                        <p className="text-stone-400 mt-2">Model confidence</p>
                    </div>
                </div>
            </section>

            <GlassCard className="report-section">
                <h2 className="text-2xl font-bold text-glass-white report-header">Efficiency Index</h2>
                <p className="text-stone-300 mb-3">Score: <span className="font-semibold text-white print:text-black">{latestSession.modelOutputs.efficiencyIndex}</span></p>
                <div className="h-80 chart-crisp">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={latestSession.modelOutputs.hrAccelerationTrend}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                            <XAxis dataKey="name" stroke="#9ca3af" />
                            <YAxis yAxisId="left" stroke="#9ca3af" />
                            <YAxis yAxisId="right" orientation="right" stroke="#9ca3af" />
                            <Tooltip />
                            <Legend />
                            <Line yAxisId="left" type="monotone" dataKey="hr" stroke="#00FFAB" strokeWidth={3} name="HR" dot={false} />
                            <Line yAxisId="right" type="monotone" dataKey="acceleration" stroke="#FFD24D" strokeWidth={3} name="Acceleration" dot={false} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </GlassCard>

            <GlassCard className="report-section">
                <h2 className="text-2xl font-bold text-glass-white report-header">Recovery Pattern Analysis</h2>
                <p className="text-stone-300 mb-3">Score: <span className="font-semibold text-white print:text-black">{latestSession.modelOutputs.recoveryPattern}</span></p>
                <div className="h-72 chart-crisp">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={athlete.models.linearRegression.data}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                            <XAxis dataKey="name" stroke="#9ca3af" />
                            <YAxis stroke="#9ca3af" />
                            <Tooltip />
                            <Legend />
                            <Line type="monotone" dataKey="actual" stroke="#00FFAB" strokeWidth={2} name="Actual" />
                            <Line type="monotone" dataKey="predicted" stroke="#FFD24D" strokeWidth={2} name="Predicted" />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </GlassCard>

            <GlassCard className="report-section">
                <h2 className="text-2xl font-bold text-glass-white report-header">Consistency Monitoring</h2>
                <p className="text-stone-300 mb-3">Score: <span className="font-semibold text-white print:text-black">{latestSession.modelOutputs.consistencyMonitoring}</span></p>
                <div className="h-72 chart-crisp">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={athlete.riskProgression}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                            <XAxis dataKey="date" stroke="#9ca3af" />
                            <YAxis stroke="#9ca3af" domain={[0, 100]} />
                            <Tooltip />
                            <Line type="monotone" dataKey="score" stroke="#FF4D4D" strokeWidth={3} name="Risk Progression" />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </GlassCard>

            <GlassCard className="report-section">
                <h2 className="text-2xl font-bold text-glass-white report-header">Composite Risk Assessment</h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div>
                        <h3 className="text-lg font-semibold text-white print:text-black mb-2">HR vs Acceleration Trend</h3>
                        <div className="h-72 chart-crisp">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={latestSession.modelOutputs.hrAccelerationTrend}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                                    <XAxis dataKey="name" stroke="#9ca3af" />
                                    <YAxis yAxisId="left" stroke="#9ca3af" />
                                    <YAxis yAxisId="right" orientation="right" stroke="#9ca3af" />
                                    <Tooltip />
                                    <Line yAxisId="left" type="monotone" dataKey="hr" stroke="#00FFAB" strokeWidth={3} />
                                    <Line yAxisId="right" type="monotone" dataKey="acceleration" stroke="#FFD24D" strokeWidth={3} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-white print:text-black mb-2">Anomaly Visualization</h3>
                        <div className="h-72 chart-crisp">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={latestSession.modelOutputs.anomalyVisualization} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                                    <XAxis type="number" stroke="#9ca3af" />
                                    <YAxis type="category" dataKey="feature" stroke="#9ca3af" width={120} />
                                    <Tooltip />
                                    <Bar dataKey="impact" fill="#FFD24D" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </GlassCard>

            <div className="print-footer hidden text-center text-xs text-gray-500 mt-8">
                <p>AntiDOPE.ai | Official Analytical Report | Generated {new Date().toLocaleString()}</p>
            </div>
        </div>
    );
}
