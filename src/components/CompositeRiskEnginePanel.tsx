import { motion } from 'framer-motion';
import { Athlete } from '../data/athletes';
import GlassCard from './GlassCard';
import AnimatedRiskGauge from './AnimatedRiskGauge';

type CompositeRiskEnginePanelProps = {
  modelData: Athlete['models']['compositeRisk'];
};

export default function CompositeRiskEnginePanel({ modelData }: CompositeRiskEnginePanelProps) {
  return (
    <GlassCard>
      <h3 className="text-xl font-bold text-glass-white mb-1">Composite Risk Assessment</h3>
      <p className="text-sm text-stone-400 mb-6">Weighted fusion of analysis outputs</p>
      <div className="flex items-center justify-center mb-6">
        <AnimatedRiskGauge value={modelData.score} />
      </div>
      <div>
        <h4 className="font-semibold text-white mb-2 text-center">Contribution Breakdown:</h4>
        <div className="flex justify-center gap-4">
            <div className="text-center">
                <p className="text-2xl font-bold text-risk-moderate">{(modelData.contributions.trend * 100).toFixed(0)}%</p>
                <p className="text-xs text-stone-400">Trend Signal</p>
            </div>
            <div className="text-center">
                <p className="text-2xl font-bold text-risk-high">{(modelData.contributions.anomaly * 100).toFixed(0)}%</p>
                <p className="text-xs text-stone-400">Anomaly Signal</p>
            </div>
        </div>
      </div>
    </GlassCard>
  );
}
