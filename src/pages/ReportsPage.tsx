import { Link } from 'react-router-dom';
import { useMemo, useState } from 'react';
import GlassCard from '../components/GlassCard';
import RiskBadge from '../components/RiskBadge';
import { useAthletes } from '../hooks/useAthletes';
import { RiskLevel } from '../data/athletes';

type SortOption =
    | 'newest'
    | 'oldest'
    | 'riskHighToLow'
    | 'riskLowToHigh'
    | 'confidenceHighToLow'
    | 'athleteAZ';

type ReportRow = {
    sessionId: string;
    athleteId: string;
    athleteName: string;
    sport: string;
    fileName: string;
    generatedAt: string;
    confidence: number;
    riskScore: number;
    riskLevel: RiskLevel;
};

const riskWeight: Record<RiskLevel, number> = {
    High: 3,
    Moderate: 2,
    Low: 1,
};

export default function ReportsPage() {
    const { athletes } = useAthletes();

    const [search, setSearch] = useState('');
    const [selectedSport, setSelectedSport] = useState('All');
    const [selectedRisk, setSelectedRisk] = useState<'All' | RiskLevel>('All');
    const [sortBy, setSortBy] = useState<SortOption>('newest');

    const allReports = useMemo<ReportRow[]>(() => {
        return athletes.flatMap((athlete) =>
            athlete.uploadSessions.map((session) => ({
                sessionId: session.sessionId,
                athleteId: athlete.id,
                athleteName: athlete.name,
                sport: athlete.sport,
                fileName: session.fileName,
                generatedAt: session.inferenceTimestamp,
                confidence: session.confidence,
                riskScore: session.modelOutputs.compositeRiskAssessment.score,
                riskLevel: session.modelOutputs.compositeRiskAssessment.level,
            }))
        );
    }, [athletes]);

    const sports = useMemo(() => ['All', ...new Set(allReports.map((report) => report.sport))], [allReports]);

    const filteredReports = useMemo(() => {
        const normalizedSearch = search.trim().toLowerCase();

        const filtered = allReports.filter((report) => {
            const matchesSearch =
                !normalizedSearch ||
                report.athleteName.toLowerCase().includes(normalizedSearch) ||
                report.athleteId.toLowerCase().includes(normalizedSearch) ||
                report.fileName.toLowerCase().includes(normalizedSearch);

            const matchesSport = selectedSport === 'All' || report.sport === selectedSport;
            const matchesRisk = selectedRisk === 'All' || report.riskLevel === selectedRisk;

            return matchesSearch && matchesSport && matchesRisk;
        });

        return filtered.sort((left, right) => {
            switch (sortBy) {
                case 'oldest':
                    return new Date(left.generatedAt).getTime() - new Date(right.generatedAt).getTime();
                case 'riskHighToLow':
                    return right.riskScore - left.riskScore;
                case 'riskLowToHigh':
                    return left.riskScore - right.riskScore;
                case 'confidenceHighToLow':
                    return right.confidence - left.confidence;
                case 'athleteAZ':
                    return left.athleteName.localeCompare(right.athleteName);
                case 'newest':
                default:
                    return new Date(right.generatedAt).getTime() - new Date(left.generatedAt).getTime();
            }
        });
    }, [allReports, search, selectedSport, selectedRisk, sortBy]);

    const totalReports = allReports.length;
    const highRiskCount = allReports.filter((report) => report.riskLevel === 'High').length;

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-4xl font-bold text-glass-white">Reports</h1>
                <p className="text-stone-400">Recently generated reports across all athletes with filter and sorting controls.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <GlassCard>
                    <p className="text-sm text-stone-400">Total Reports</p>
                    <p className="text-3xl font-bold text-white">{totalReports}</p>
                </GlassCard>
                <GlassCard>
                    <p className="text-sm text-stone-400">Filtered Results</p>
                    <p className="text-3xl font-bold text-white">{filteredReports.length}</p>
                </GlassCard>
                <GlassCard>
                    <p className="text-sm text-stone-400">High Risk Reports</p>
                    <p className="text-3xl font-bold text-risk-high">{highRiskCount}</p>
                </GlassCard>
            </div>

            <GlassCard>
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                    <input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search athlete, ID, or file"
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-white/20"
                    />

                    <select
                        value={selectedSport}
                        onChange={(event) => setSelectedSport(event.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-white/20"
                    >
                        {sports.map((sport) => (
                            <option key={sport} value={sport}>
                                {sport}
                            </option>
                        ))}
                    </select>

                    <select
                        value={selectedRisk}
                        onChange={(event) => setSelectedRisk(event.target.value as 'All' | RiskLevel)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-white/20"
                    >
                        <option value="All">All Risk Levels</option>
                        <option value="High">High</option>
                        <option value="Moderate">Moderate</option>
                        <option value="Low">Low</option>
                    </select>

                    <select
                        value={sortBy}
                        onChange={(event) => setSortBy(event.target.value as SortOption)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-white/20"
                    >
                        <option value="newest">Sort: Newest</option>
                        <option value="oldest">Sort: Oldest</option>
                        <option value="riskHighToLow">Sort: Risk High to Low</option>
                        <option value="riskLowToHigh">Sort: Risk Low to High</option>
                        <option value="confidenceHighToLow">Sort: Confidence High to Low</option>
                        <option value="athleteAZ">Sort: Athlete A-Z</option>
                    </select>
                </div>
            </GlassCard>

            <GlassCard>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-glass-stroke">
                                <th className="p-4 text-sm font-semibold text-stone-400 uppercase tracking-wider">Generated</th>
                                <th className="p-4 text-sm font-semibold text-stone-400 uppercase tracking-wider">Athlete</th>
                                <th className="p-4 text-sm font-semibold text-stone-400 uppercase tracking-wider">Sport</th>
                                <th className="p-4 text-sm font-semibold text-stone-400 uppercase tracking-wider">File</th>
                                <th className="p-4 text-sm font-semibold text-stone-400 uppercase tracking-wider">Risk</th>
                                <th className="p-4 text-sm font-semibold text-stone-400 uppercase tracking-wider">Confidence</th>
                                <th className="p-4 text-sm font-semibold text-stone-400 uppercase tracking-wider">Open</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredReports.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="p-6 text-center text-stone-400">
                                        No reports found for the selected filters.
                                    </td>
                                </tr>
                            ) : (
                                filteredReports.map((report) => (
                                    <tr key={report.sessionId} className="border-b border-glass-stroke/50 last:border-none hover:bg-glass-highlight transition-colors duration-300">
                                        <td className="p-4 text-white">{new Date(report.generatedAt).toLocaleString()}</td>
                                        <td className="p-4 text-white">
                                            <div>
                                                <p className="font-semibold">{report.athleteName}</p>
                                                <p className="text-xs text-stone-400">ID: {report.athleteId}</p>
                                            </div>
                                        </td>
                                        <td className="p-4 text-white">{report.sport}</td>
                                        <td className="p-4 text-white">{report.fileName}</td>
                                        <td className="p-4 text-white">
                                            <div className="flex items-center gap-3">
                                                <RiskBadge level={report.riskLevel} />
                                                <span className="text-sm text-stone-300">{report.riskScore}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 text-white">{(report.confidence * 100).toFixed(0)}%</td>
                                        <td className="p-4 text-white">
                                            <Link
                                                to={`/report/${report.athleteId}`}
                                                className="px-3 py-1.5 rounded-md bg-white/10 border border-white/20 hover:bg-white/20 text-sm"
                                            >
                                                View
                                            </Link>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </GlassCard>
        </div>
    );
}
