import { Link } from 'react-router-dom';
import FilterDropdown from '../components/FilterDropdown';
import GlassCard from '../components/GlassCard';
import GlassSearchBar from '../components/GlassSearchBar';
import GlassTable from '../components/GlassTable';
import RiskBadge from '../components/RiskBadge';
import { useAthletes } from '../hooks/useAthletes';

export default function SearchFilterPage() {
    const { athletes } = useAthletes();

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-4xl font-bold text-glass-white">Athletes</h1>
                    <p className="text-stone-400">Search, filter, and manage athlete profiles.</p>
                </div>
                <div className="flex items-center gap-4">
                    <FilterDropdown />
                    <FilterDropdown />
                </div>
            </div>

            <GlassSearchBar />

            <GlassCard>
                <GlassTable
                    headers={['Name', 'Discipline', 'Last Inference', 'Risk Level']}
                    data={athletes.map(athlete => [
                        <Link to={`/athlete/${athlete.id}`} className="font-semibold hover:underline">{athlete.name}</Link>,
                        athlete.sport,
                        new Date(athlete.lastInference.timestamp).toLocaleDateString(),
                        <RiskBadge level={athlete.models.compositeRisk.level} />
                    ])}
                />
            </GlassCard>
        </div>
    );
}
