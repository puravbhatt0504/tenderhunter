import { PlayCircle, BarChart3, AlertTriangle, Zap, FileSearch } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card'
import { Textarea } from './ui/Textarea'
import { Button } from './ui/Button'

export function TenderAnalyzer({ tenderText, setTenderText, analysisResult, isAnalyzing, analysisError, onAnalyze }) {
    return (
        <Card className="h-full border-l-4 border-l-emerald-500 bg-gradient-to-br from-white to-emerald-50/30">
            <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl text-white shadow-lg shadow-emerald-500/25">
                        <FileSearch className="w-5 h-5" />
                    </div>
                    <div>
                        <CardTitle className="text-lg">Tender Analyzer</CardTitle>
                        <p className="text-xs text-slate-500 mt-0.5">AI-powered eligibility check</p>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
                <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                        <BarChart3 className="w-3.5 h-3.5 text-slate-400" />
                        Paste Tender Details
                    </label>
                    <Textarea
                        value={tenderText}
                        onChange={(e) => setTenderText(e.target.value)}
                        placeholder="Paste the tender document text, requirements, or NIT details here for AI analysis..."
                        rows={8}
                        className="font-mono text-sm bg-white/80 border-slate-200"
                    />
                </div>

                <Button
                    onClick={onAnalyze}
                    disabled={!tenderText.trim()}
                    isLoading={isAnalyzing}
                    variant="primary"
                    className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-lg shadow-emerald-500/25"
                >
                    {isAnalyzing ? "Analyzing..." : (
                        <>
                            <Zap className="w-4 h-4 mr-2" />
                            Analyze Eligibility
                        </>
                    )}
                </Button>

                {analysisError && (
                    <div className="bg-gradient-to-r from-red-50 to-rose-50 border border-red-200/60 text-red-700 px-4 py-3 rounded-xl animate-fade-in">
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 shrink-0" />
                            <span className="text-sm">{analysisError}</span>
                        </div>
                    </div>
                )}

                {analysisResult && (
                    <div className="mt-4 border border-slate-200/60 rounded-xl overflow-hidden animate-fade-in bg-white shadow-sm">
                        <div className="bg-gradient-to-r from-slate-100 to-slate-50 px-4 py-3 border-b border-slate-200/60">
                            <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                <BarChart3 className="w-4 h-4 text-emerald-600" />
                                Analysis Results
                            </h3>
                        </div>
                        <div
                            className="p-4 prose prose-sm max-w-none text-slate-700 prose-headings:text-slate-900 prose-strong:text-slate-900 prose-li:marker:text-emerald-500"
                            dangerouslySetInnerHTML={{ __html: analysisResult }}
                        />
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
