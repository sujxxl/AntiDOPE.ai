import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FileSpreadsheet, LoaderCircle, UploadCloud } from 'lucide-react';
import * as XLSX from 'xlsx';
import GlassButton from '../components/GlassButton';
import GlassCard from '../components/GlassCard';
import AthleteSelect from '../components/AthleteSelect';
import { Athlete, UploadSession } from '../data/athletes';
import CreateAthleteModal from '../components/CreateAthleteModal';
import { useAthletes } from '../hooks/useAthletes';
import AlertBanner from '../components/AlertBanner';
import RiskBadge from '../components/RiskBadge';
import { analyzeDatasetFile } from '../services/backend';
import { saveAthleteAndReport } from '../services/supabaseReports';

type ParsedUpload = {
    fileName: string;
    rowCount: number;
    columns: string[];
    validRows: number;
    invalidRows: number;
    previewRows: Record<string, string | number>[];
    parsedRows: Record<string, unknown>[];
};

const parseCsv = async (file: File): Promise<Record<string, unknown>[]> => {
    const text = await file.text();
    const lines = text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

    if (lines.length < 2) {
        return [];
    }

    const headers = lines[0].split(',').map((header) => header.trim());

    return lines.slice(1).map((line) => {
        const values = line.split(',').map((value) => value.trim());
        const row: Record<string, unknown> = {};

        headers.forEach((header, index) => {
            const rawValue = values[index] ?? '';
            const numericValue = Number(rawValue);
            row[header] = rawValue !== '' && Number.isFinite(numericValue) ? numericValue : rawValue;
        });

        return row;
    });
};

const parseXlsx = async (file: File): Promise<Record<string, unknown>[]> => {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[firstSheetName];
    return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
};

export default function UploadPage() {
    const { athletes, createAthlete, generateAthleteId, attachUploadToAthlete } = useAthletes();
    const [searchParams] = useSearchParams();
    const presetAthleteId = searchParams.get('athlete');
    const [selectedAthlete, setSelectedAthlete] = useState<Athlete | null>(() =>
        athletes.find((athlete) => athlete.id === presetAthleteId) ?? null
    );
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isParsing, setIsParsing] = useState(false);
    const [isRunningInference, setIsRunningInference] = useState(false);
    const [uploadPreview, setUploadPreview] = useState<ParsedUpload | null>(null);
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [uploadSuccess, setUploadSuccess] = useState<{ session: UploadSession; athlete: Athlete } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const inferredColumns = useMemo(() => uploadPreview?.columns.slice(0, 8) ?? [], [uploadPreview]);

    useEffect(() => {
        if (!selectedAthlete && presetAthleteId) {
            const preset = athletes.find((athlete) => athlete.id === presetAthleteId);
            if (preset) {
                setSelectedAthlete(preset);
            }
        }
    }, [athletes, presetAthleteId, selectedAthlete]);

    const handleCreateAthlete = (payload: {
        name: string;
        id: string;
        age: number;
        sport: string;
        gender: Athlete['gender'];
        baselineMetrics?: Athlete['baselineMetrics'];
    }) => {
        const athlete = createAthlete(payload);
        setSelectedAthlete(athlete);
        setIsModalOpen(false);
    };

    const handleSelectAthlete = (athlete: Athlete | null) => {
        setSelectedAthlete(athlete);
        setUploadPreview(null);
        setUploadFile(null);
        setUploadError(null);
        setUploadSuccess(null);
    };

    const handlePickFile = () => fileInputRef.current?.click();

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];

        if (!file || !selectedAthlete) {
            return;
        }

        setIsParsing(true);
        setUploadError(null);
        setUploadSuccess(null);

        try {
            const isCsv = file.name.toLowerCase().endsWith('.csv');
            const isXlsx = file.name.toLowerCase().endsWith('.xlsx');

            if (!isCsv && !isXlsx) {
                throw new Error('Unsupported file format. Please upload CSV or XLSX.');
            }

            const parsedRows = isCsv ? await parseCsv(file) : await parseXlsx(file);

            if (parsedRows.length === 0) {
                throw new Error('No rows found in this file. Please upload a valid dataset.');
            }

            const columns = Object.keys(parsedRows[0]);

            if (columns.length < 2) {
                throw new Error('Dataset validation failed. At least 2 columns are required.');
            }

            const invalidRows = parsedRows.filter((row) =>
                columns.every((column) => `${row[column] ?? ''}`.trim() === '')
            ).length;

            setUploadPreview({
                fileName: file.name,
                rowCount: parsedRows.length,
                columns,
                validRows: parsedRows.length - invalidRows,
                invalidRows,
                previewRows: parsedRows.slice(0, 5).map((row) => {
                    const limited: Record<string, string | number> = {};
                    columns.slice(0, 6).forEach((column) => {
                        const value = row[column];
                        limited[column] = typeof value === 'number' ? value : `${value ?? ''}`;
                    });
                    return limited;
                }),
                parsedRows,
            });
            setUploadFile(file);
        } catch (error) {
            setUploadPreview(null);
            setUploadFile(null);
            setUploadError(error instanceof Error ? error.message : 'Unable to process this file.');
        } finally {
            setIsParsing(false);
            event.target.value = '';
        }
    };

    const handleRunInference = async () => {
        if (!selectedAthlete || !uploadPreview || !uploadFile) {
            return;
        }

        setIsRunningInference(true);

        try {
            const backendResult = await analyzeDatasetFile(uploadFile);

            const result = attachUploadToAthlete({
                athleteId: selectedAthlete.id,
                fileName: uploadPreview.fileName,
                rowCount: uploadPreview.rowCount,
                columns: uploadPreview.columns,
                validRows: uploadPreview.validRows,
                invalidRows: uploadPreview.invalidRows,
                parsedRows: uploadPreview.parsedRows,
                analysisResult: backendResult,
            });

            await saveAthleteAndReport({
                athlete: result.athlete,
                session: result.session,
            });

            setSelectedAthlete(result.athlete);
            setUploadSuccess(result);
        } catch (error) {
            setUploadError(error instanceof Error ? error.message : 'Inference failed.');
        } finally {
            setIsRunningInference(false);
        }
    };

    return (
        <div className="space-y-8">
            {isModalOpen && (
                <CreateAthleteModal
                    onClose={() => setIsModalOpen(false)}
                    onCreate={handleCreateAthlete}
                    generateId={generateAthleteId}
                />
            )}

            <div>
                <h1 className="text-4xl font-bold text-glass-white">Athlete-Linked Data Upload</h1>
                <p className="text-stone-400">Select athlete, upload CSV/XLSX, validate, and run inference.</p>
            </div>

            {uploadError ? <AlertBanner message={uploadError} level="High" /> : null}
            {uploadSuccess ? (
                <AlertBanner
                    message={`Analysis complete for ${uploadSuccess.athlete.name}. Composite risk score: ${uploadSuccess.session.modelOutputs.compositeRiskAssessment.score}.`}
                    level="Low"
                />
            ) : null}

            <GlassCard>
                <div className="p-8 space-y-8">
                    <div>
                        <label className="block text-lg font-semibold text-stone-300 mb-3">1. Select Athlete</label>
                        <AthleteSelect
                            athletes={athletes}
                            selectedAthlete={selectedAthlete}
                            onSelectAthlete={handleSelectAthlete}
                            onCreateNew={() => setIsModalOpen(true)}
                        />
                    </div>

                    <div className={`transition-opacity duration-500 ${selectedAthlete ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                        <label className="block text-lg font-semibold text-stone-300 mb-3">2. Upload Dataset (CSV/XLSX)</label>
                        <input
                            ref={fileInputRef}
                            type="file"
                            className="hidden"
                            accept=".csv,.xlsx"
                            onChange={handleFileUpload}
                            disabled={!selectedAthlete || isParsing || isRunningInference}
                        />
                        <div className="flex flex-col items-center justify-center p-10 border-2 border-dashed border-glass-stroke rounded-xl text-center">
                            <UploadCloud className="w-16 h-16 text-stone-400 mb-4" />
                            <p className="text-lg font-semibold text-white mb-2">Upload athlete-linked dataset</p>
                            <p className="text-stone-400 mb-4">Only CSV/XLSX format supported</p>
                            <GlassButton disabled={!selectedAthlete || isParsing || isRunningInference} onClick={handlePickFile}>
                                {isParsing ? (
                                    <>
                                        <LoaderCircle className="w-4 h-4 mr-2 animate-spin" />
                                        Validating...
                                    </>
                                ) : (
                                    <>
                                        <FileSpreadsheet className="w-4 h-4 mr-2" />
                                        Browse Files
                                    </>
                                )}
                            </GlassButton>
                            <p className="text-xs text-stone-500 mt-4">Upload is disabled until an athlete is selected.</p>
                        </div>
                    </div>

                    {uploadPreview ? (
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-white">3. Validation Preview</h3>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                                    <p className="text-xs text-stone-400">File</p>
                                    <p className="font-semibold text-white truncate">{uploadPreview.fileName}</p>
                                </div>
                                <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                                    <p className="text-xs text-stone-400">Rows</p>
                                    <p className="font-semibold text-white">{uploadPreview.rowCount}</p>
                                </div>
                                <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                                    <p className="text-xs text-stone-400">Valid Rows</p>
                                    <p className="font-semibold text-risk-low">{uploadPreview.validRows}</p>
                                </div>
                                <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                                    <p className="text-xs text-stone-400">Invalid Rows</p>
                                    <p className="font-semibold text-risk-high">{uploadPreview.invalidRows}</p>
                                </div>
                            </div>

                            <div className="overflow-x-auto rounded-lg border border-glass-stroke">
                                <table className="min-w-full text-sm">
                                    <thead className="bg-white/5">
                                        <tr>
                                            {inferredColumns.map((column) => (
                                                <th key={column} className="px-3 py-2 text-left text-stone-300 font-semibold">{column}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {uploadPreview.previewRows.map((row, index) => (
                                            <tr key={`${index}-${uploadPreview.fileName}`} className="border-t border-white/5">
                                                {inferredColumns.map((column) => (
                                                    <td key={`${column}-${index}`} className="px-3 py-2 text-stone-200">{String(row[column] ?? '')}</td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="flex items-center justify-between gap-4">
                                <p className="text-sm text-stone-400">Data will be attached to <span className="text-white font-semibold">{selectedAthlete?.name}</span>.</p>
                                <GlassButton disabled={isRunningInference} onClick={handleRunInference}>
                                    {isRunningInference ? (
                                        <>
                                            <LoaderCircle className="w-4 h-4 mr-2 animate-spin" />
                                            Running Inference...
                                        </>
                                    ) : (
                                        'Attach Data & Run Inference'
                                    )}
                                </GlassButton>
                            </div>
                        </div>
                    ) : null}

                    {uploadSuccess ? (
                        <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-3">
                            <h3 className="text-lg font-semibold text-white">4. Analysis Summary</h3>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                                <div>
                                    <p className="text-stone-400">Athlete</p>
                                    <p className="font-semibold text-white">{uploadSuccess.athlete.name}</p>
                                </div>
                                <div>
                                    <p className="text-stone-400">Composite Risk</p>
                                    <div className="mt-1">
                                        <RiskBadge level={uploadSuccess.session.modelOutputs.compositeRiskAssessment.level} />
                                    </div>
                                </div>
                                <div>
                                    <p className="text-stone-400">Risk Score</p>
                                    <p className="font-semibold text-white">{uploadSuccess.session.modelOutputs.compositeRiskAssessment.score}</p>
                                </div>
                                <div>
                                    <p className="text-stone-400">Inference Time</p>
                                    <p className="font-semibold text-white">{new Date(uploadSuccess.session.inferenceTimestamp).toLocaleString()}</p>
                                </div>
                            </div>
                        </div>
                    ) : null}
                </div>
            </GlassCard>
        </div>
    );
}
