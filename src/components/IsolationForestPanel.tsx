import { motion } from 'framer-motion';
import { Athlete } from '../data/athletes';
import GlassCard from './GlassCard';

type IsolationForestPanelProps = {
  modelData: Athlete['models']['isolationForest'];
};

export default function IsolationForestPanel({ modelData }: IsolationForestPanelProps) {
  return (
    <GlassCard>
      <h3 className="text-xl font-bold text-glass-white mb-1">Consistency Monitoring</h3>
      <p className="text-sm text-stone-400 mb-6">Variability anomaly and stability pattern analysis</p>
      <div className="flex items-center justify-center mb-6">
        <div className="relative w-48 h-24 overflow-hidden">
          <motion.div 
            initial={{ rotate: -90 }}
            animate={{ rotate: -90 + (modelData.anomalyScore * 180) }}
            transition={{ type: 'spring', stiffness: 100, damping: 15 }}
            className="absolute top-0 left-0 w-full h-full origin-bottom-center"
          >
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2 h-24 bg-white rounded-t-full shadow-lg"></div>
          </motion.div>
          <div className="absolute inset-0 border-t-8 border-l-8 border-r-8 border-b-0 border-risk-low rounded-t-full" style={{ borderTopColor: '#00FFAB', borderLeftColor: '#00FFAB', borderRightColor: '#00FFAB' }}></div>
          <div className="absolute inset-0 border-t-8 border-l-8 border-r-8 border-b-0 border-risk-moderate rounded-t-full" style={{ clipPath: 'polygon(50% 0, 100% 0, 100% 100%, 50% 100%)' }}></div>
          <div className="absolute inset-0 border-t-8 border-l-8 border-r-8 border-b-0 border-risk-high rounded-t-full" style={{ clipPath: 'polygon(50% 0, 100% 0, 100% 100%, 50% 100%)', transform: 'rotate(90deg)', transformOrigin: '50% 100%' }}></div>
        </div>
      </div>
      <div className="text-center mb-6">
        <p className="text-4xl font-bold text-white">{(modelData.outlierProbability * 100).toFixed(0)}%</p>
        <p className="text-sm text-stone-400">Outlier Probability</p>
      </div>
      <div>
        <h4 className="font-semibold text-white mb-2">Dataset Metric Impact:</h4>
        <div className="space-y-2">
          {modelData.featureImpact.map(f => (
            <div key={f.feature} className="flex items-center">
              <span className="w-24 text-sm text-stone-300">{f.feature}</span>
              <div className="flex-1 h-2 bg-white/10 rounded-full">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${f.impact * 100}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className="h-full bg-risk-moderate rounded-full"
                ></motion.div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </GlassCard>
  );
}
