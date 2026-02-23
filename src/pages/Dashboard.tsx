import { Link } from 'react-router-dom';
import AnimatedRiskGauge from '../components/AnimatedRiskGauge';
import GlassCard from '../components/GlassCard';
import GlassTable from '../components/GlassTable';
import RiskBadge from '../components/RiskBadge';
import { useAthletes } from '../hooks/useAthletes';

export default function Dashboard() {
  const { athletes } = useAthletes();
  const highRiskAthletes = athletes.filter(a => a.models.compositeRisk.level === 'High');
  const recentActivity = [...athletes].sort((a, b) => new Date(b.lastInference.timestamp).getTime() - new Date(a.lastInference.timestamp).getTime()).slice(0, 4);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <GlassCard className="lg:col-span-2">
        <h2 className="text-2xl font-bold text-glass-white mb-4">Model Activity Overview</h2>
        {/* Chart will go here */}
        <div className="h-64 bg-white/5 rounded-lg flex items-center justify-center text-stone-400">Model Performance Chart Placeholder</div>
      </GlassCard>
      <GlassCard>
        <h2 className="text-2xl font-bold text-glass-white mb-4">High-Risk Alerts</h2>
        <div className="space-y-3">
          {highRiskAthletes.map(athlete => (
            <Link to={`/athlete/${athlete.id}`} key={athlete.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
              <p className="font-medium">{athlete.name}</p>
              <RiskBadge level={athlete.models.compositeRisk.level} />
            </Link>
          ))}
        </div>
      </GlassCard>
      <GlassCard>
        <h2 className="text-2xl font-bold text-glass-white mb-4">Fleet Average Risk</h2>
        <div className="flex items-center justify-center h-48">
          <AnimatedRiskGauge value={Math.round(athletes.reduce((acc, a) => acc + a.models.compositeRisk.score, 0) / athletes.length)} />
        </div>
      </GlassCard>
      <GlassCard className="lg:col-span-2">
        <h2 className="text-2xl font-bold text-glass-white mb-4">Recent Inferences</h2>
        <GlassTable
          headers={['Athlete', 'Inference Time', 'Confidence', 'Risk Score']}
          data={recentActivity.map(activity => [
            <Link to={`/athlete/${activity.id}`} className="hover:underline">{activity.name}</Link>,
            new Date(activity.lastInference.timestamp).toLocaleString(),
            `${(activity.lastInference.confidence * 100).toFixed(0)}%`,
            activity.models.compositeRisk.score
          ])}
        />
      </GlassCard>
    </div>
  );
}
