import { useParams, Link } from 'react-router-dom';
import { Clock, Plus } from 'lucide-react';
import GlassCard from '../components/GlassCard';
import RiskBadge from '../components/RiskBadge';
import { useAthletes } from '../hooks/useAthletes';
import LinearRegressionPanel from '../components/LinearRegressionPanel';
import IsolationForestPanel from '../components/IsolationForestPanel';
import CompositeRiskEnginePanel from '../components/CompositeRiskEnginePanel';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import GlassButton from '../components/GlassButton';

export default function AthleteProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { athletes } = useAthletes();
  const athlete = athletes.find((a) => a.id === id);

  if (!athlete) {
    return <div className="text-white text-center text-2xl">Athlete not found</div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-glass-white">{athlete.name}</h1>
          <p className="text-stone-400">ID: {athlete.id} | {athlete.sport}</p>
        </div>
        <div className="flex items-center gap-4">
          <Link to={`/upload?athlete=${athlete.id}`}>
            <GlassButton variant="secondary">
              <Plus className="w-4 h-4 mr-2" />
              Add New Data
            </GlassButton>
          </Link>
          <div className="text-right">
            <RiskBadge level={athlete.models.compositeRisk.level} />
            <div className="flex items-center gap-2 text-xs text-stone-400 mt-2">
              <Clock className="w-3 h-3" />
              <span>Last Inference: {new Date(athlete.lastInference.timestamp).toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <LinearRegressionPanel modelData={athlete.models.linearRegression} />
        <IsolationForestPanel modelData={athlete.models.isolationForest} />
        <CompositeRiskEnginePanel modelData={athlete.models.compositeRisk} />
      </div>

      <GlassCard>
        <h3 className="text-xl font-bold text-glass-white mb-4">Risk Progression Over Time</h3>
        <div className="h-80 pr-8">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={athlete.riskProgression}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
              <XAxis dataKey="date" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" domain={[0, 100]} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(10, 10, 10, 0.8)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '1rem',
                  color: '#fff'
                }}
              />
              <Line type="monotone" dataKey="score" stroke="#FF4D4D" strokeWidth={2} name="Risk Score" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </GlassCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <GlassCard>
          <h3 className="text-xl font-bold text-glass-white mb-4">Historical Uploads</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-stone-400 border-b border-glass-stroke">
                  <th className="pb-2">Date</th>
                  <th className="pb-2">File</th>
                  <th className="pb-2">Risk Score</th>
                </tr>
              </thead>
              <tbody>
                {athlete.historicalData.map((item) => (
                  <tr key={`${item.uploadDate}-${item.fileName}`} className="border-b border-white/5">
                    <td className="py-2">{item.uploadDate}</td>
                    <td className="py-2 truncate max-w-[220px]">{item.fileName}</td>
                    <td className="py-2">{item.riskScore}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>

        <GlassCard>
          <h3 className="text-xl font-bold text-glass-white mb-4">Analysis Outputs Per Session</h3>
          <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
            {athlete.uploadSessions.map((session) => (
              <div key={session.sessionId} className="p-3 rounded-lg border border-white/10 bg-white/5">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-white">{session.fileName}</p>
                  <RiskBadge level={session.modelOutputs.compositeRiskAssessment.level} />
                </div>
                <p className="text-xs text-stone-400 mt-1">Inference: {new Date(session.inferenceTimestamp).toLocaleString()}</p>
                <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
                  <p className="text-stone-300">Efficiency Index: <span className="text-white">{session.modelOutputs.efficiencyIndex}</span></p>
                  <p className="text-stone-300">Recovery Pattern: <span className="text-white">{session.modelOutputs.recoveryPattern}</span></p>
                  <p className="text-stone-300">Consistency: <span className="text-white">{session.modelOutputs.consistencyMonitoring}</span></p>
                  <p className="text-stone-300">Confidence: <span className="text-white">{(session.confidence * 100).toFixed(0)}%</span></p>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
