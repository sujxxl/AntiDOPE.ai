import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

type AnimatedRiskGaugeProps = {
  value: number; // 0 to 100
};

const getColor = (value: number) => {
  if (value < 40) return '#00FFAB';
  if (value < 70) return '#FFD24D';
  return '#FF4D4D';
};

export default function AnimatedRiskGauge({ value }: AnimatedRiskGaugeProps) {
  const color = getColor(value);
  const data = [
    { name: 'value', value: value },
    { name: 'bg', value: 100 - value },
  ];

  return (
    <div className="relative w-48 h-48">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            startAngle={180}
            endAngle={-180}
            innerRadius="70%"
            outerRadius="100%"
            paddingAngle={0}
            dataKey="value"
            stroke="none"
          >
            <Cell fill={color} />
            <Cell fill="rgba(255, 255, 255, 0.05)" />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="absolute inset-0 flex items-center justify-center flex-col"
      >
        <span className="text-5xl font-bold text-white tracking-tighter">{value}</span>
        <span className="text-sm text-stone-400 font-mono uppercase">Risk Score</span>
      </motion.div>
    </div>
  );
}
