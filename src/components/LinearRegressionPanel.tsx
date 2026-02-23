import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Athlete } from '../data/athletes';
import GlassCard from './GlassCard';

type LinearRegressionPanelProps = {
  modelData: Athlete['models']['linearRegression'];
};

export default function LinearRegressionPanel({ modelData }: LinearRegressionPanelProps) {
  const deviationPercent = modelData.prediction > 0
    ? ((modelData.deviation / modelData.prediction) * 100).toFixed(1)
    : '0.0';

  return (
    <GlassCard>
      <h3 className="text-xl font-bold text-glass-white mb-1">Efficiency Index</h3>
      <p className="text-sm text-stone-400 mb-4">HR vs Acceleration trend with baseline comparison</p>
      <div className="h-80 pr-8">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={modelData.data}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
            <XAxis dataKey="name" stroke="#9ca3af" />
            <YAxis stroke="#9ca3af" domain={['dataMin - 1', 'dataMax + 1']} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(10, 10, 10, 0.8)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '1rem',
                color: '#fff'
              }}
            />
            <Legend wrapperStyle={{ color: '#fff' }} />
            <Line type="monotone" dataKey="actual" stroke="#00FFAB" strokeWidth={2} name="Observed" />
            <Line type="monotone" dataKey="predicted" stroke="#FFD24D" strokeWidth={2} strokeDasharray="5 5" name="Expected" />
            <ReferenceLine y={modelData.prediction} label={{ value: 'Expected Level', fill: '#FFD24D' }} stroke="#FFD24D" strokeDasharray="3 3" />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 text-center">
        <p className="text-2xl font-bold text-white">Deviation: <span className="text-risk-high">{deviationPercent}%</span></p>
        <p className="text-sm text-stone-400">from expected baseline profile</p>
      </div>
    </GlassCard>
  );
}
