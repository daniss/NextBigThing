import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatDate, cn } from "@/lib/utils";
import { getCategoryLabel, getCategoryColor } from "@/lib/biomarkers";
import { CrxNavServer } from "@/components/crx-nav-server";

interface Props { params: { id: string }; }

export default async function ReportDetailPage({ params }: Props) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { data: report, error } = await supabase.from("lab_reports").select("*").eq("id", params.id).eq("user_id", user?.id).single();
    if (error || !report) notFound();

    const { data: biomarkers } = await supabase.from("biomarker_results").select("*").eq("lab_report_id", params.id).order("category").order("biomarker_name");

    const grouped: Record<string, typeof biomarkers> = {};
    biomarkers?.forEach(b => { const c = b.category || "other"; if (!grouped[c]) grouped[c] = []; grouped[c].push(b); });

    return (
        <div className="crx-background p-6 lg:p-8">
            <div className="crx-bg-shapes" aria-hidden="true" />
            <CrxNavServer activePath="/reports" />

            <div className="max-w-4xl mx-auto">
                <div className="flex items-start justify-between mb-8">
                    <div>
                        <Link href="/reports" className="inline-flex items-center gap-1 text-sm text-[#6B6B6B] hover:text-[#1A1A1A] mb-4 transition-colors">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                            Retour aux rapports
                        </Link>
                        <h1 className="text-2xl md:text-3xl font-bold text-[#1A1A1A] mb-1">{report.file_name}</h1>
                        <div className="flex items-center gap-3 text-[#6B6B6B]">
                            <span>Importé le {formatDate(report.created_at)}</span>
                            {report.lab_name && <><span>•</span><span>{report.lab_name}</span></>}
                        </div>
                    </div>
                    <div className={`px-4 py-2 rounded-full text-sm font-medium ${report.processing_status === "completed" ? "bg-green-100 text-green-700" : report.processing_status === "failed" ? "bg-red-100 text-red-700" : "bg-[#FEF9C3] text-[#CA8A04]"}`}>
                        {report.processing_status === "completed" ? "Traité" : report.processing_status === "failed" ? "Échec" : "En cours..."}
                    </div>
                </div>

                {biomarkers && biomarkers.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        <div className="crx-glass rounded-2xl p-4"><p className="text-sm text-[#6B6B6B] mb-1">Biomarqueurs</p><p className="text-3xl font-bold text-[#1A1A1A]">{biomarkers.length}</p></div>
                        <div className="crx-glass rounded-2xl p-4"><p className="text-sm text-[#6B6B6B] mb-1">Normaux</p><p className="text-3xl font-bold text-green-600">{biomarkers.filter(b => b.status === "normal").length}</p></div>
                        <div className="crx-glass rounded-2xl p-4"><p className="text-sm text-[#6B6B6B] mb-1">Hors normes</p><p className="text-3xl font-bold text-[#EAB308]">{biomarkers.filter(b => b.status === "high" || b.status === "low").length}</p></div>
                        <div className="crx-glass rounded-2xl p-4"><p className="text-sm text-[#6B6B6B] mb-1">Critiques</p><p className="text-3xl font-bold text-red-600">{biomarkers.filter(b => b.status === "critical").length}</p></div>
                    </div>
                )}

                {Object.keys(grouped).length > 0 ? (
                    <div className="space-y-6">
                        {Object.entries(grouped).map(([cat, markers]) => (
                            <div key={cat} className="crx-glass rounded-[28px] overflow-hidden">
                                <div className="px-6 py-4 border-b border-white/40 flex items-center gap-3">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getCategoryColor(cat) }} />
                                    <h2 className="font-semibold text-[#1A1A1A]">{getCategoryLabel(cat)}</h2>
                                    <span className="text-sm text-[#6B6B6B]">({markers?.length} marqueurs)</span>
                                </div>
                                <div className="divide-y divide-white/30">
                                    {markers?.map(b => (
                                        <div key={b.id} className="px-6 py-4 flex items-center justify-between hover:bg-white/30 transition-colors">
                                            <div className="flex items-center gap-4">
                                                <span className={cn("w-3 h-3 rounded-full flex-shrink-0", b.status === "normal" && "bg-green-500", b.status === "low" && "bg-blue-500", b.status === "high" && "bg-[#EAB308]", b.status === "critical" && "bg-red-500")} />
                                                <div>
                                                    <p className="font-medium text-[#1A1A1A]">{b.biomarker_name_normalized || b.biomarker_name}</p>
                                                    {b.loinc_code && <p className="text-xs text-[#9CA3AF]">LOINC: {b.loinc_code}</p>}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="flex items-baseline gap-1.5"><span className="text-xl font-bold text-[#1A1A1A]">{b.value}</span><span className="text-sm text-[#6B6B6B]">{b.unit}</span></div>
                                                {b.reference_range_text && <p className="text-xs text-[#9CA3AF]">Réf: {b.reference_range_text}</p>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : report.processing_status === "pending" || report.processing_status === "processing" ? (
                    <div className="crx-glass rounded-[28px] p-12 text-center">
                        <div className="w-16 h-16 mx-auto mb-4"><svg className="w-full h-full text-[#EAB308] animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg></div>
                        <h3 className="text-lg font-semibold text-[#1A1A1A] mb-2">Traitement en cours</h3>
                        <p className="text-[#6B6B6B]">Notre IA analyse votre bilan...</p>
                    </div>
                ) : (
                    <div className="crx-glass rounded-[28px] p-12 text-center">
                        <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4"><svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></div>
                        <h3 className="text-lg font-semibold text-[#1A1A1A] mb-2">Échec du traitement</h3>
                        <p className="text-[#6B6B6B] mb-4">Vérifiez que le PDF est lisible et réessayez.</p>
                        <Link href="/upload" className="inline-flex items-center gap-2 crx-btn-yellow px-5 py-2.5 rounded-full font-medium">Réessayer</Link>
                    </div>
                )}
            </div>
        </div>
    );
}
