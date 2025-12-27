import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import { CrxNavServer } from "@/components/crx-nav-server";

export default async function DashboardPage() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase.from("profiles").select("*").eq("id", user?.id).single();
    const { data: dbReports } = await supabase.from("lab_reports").select("*").eq("user_id", user?.id).order("created_at", { ascending: false }).limit(5);
    const { data: dbBiomarkers } = await supabase.from("biomarker_results").select("*").eq("user_id", user?.id).order("test_date", { ascending: false });

    const reports = dbReports || [];
    const biomarkers = dbBiomarkers || [];
    const hasData = reports.length > 0 || biomarkers.length > 0;

    const totalReports = reports.length;
    const uniqueBiomarkers = new Set(biomarkers.map((b: any) => b.biomarker_name_normalized || b.biomarker_name)).size;
    const alertsCount = biomarkers.filter((b: any) => b.status !== "normal").length;

    const name = profile?.full_name || "Utilisateur";

    // Get 4 recent unique biomarkers for mini chart display (real data with history)
    const biomarkerMap = new Map<string, { name: string; value: number; unit: string; status: string; history: number[] }>();
    biomarkers.forEach((b: any) => {
        const key = b.biomarker_name_normalized || b.biomarker_name;
        if (!biomarkerMap.has(key)) {
            biomarkerMap.set(key, { name: key, value: b.value, unit: b.unit || "", status: b.status || "normal", history: [b.value] });
        } else {
            biomarkerMap.get(key)!.history.push(b.value);
        }
    });
    const recentBiomarkers = Array.from(biomarkerMap.values()).slice(0, 4).map(b => ({ ...b, history: b.history.slice(-4).map(Number) }));

    return (
        <div className="crx-background p-6 lg:p-8">
            <div className="crx-bg-shapes" aria-hidden="true" />
            <CrxNavServer activePath="/dashboard" alertsCount={alertsCount} />

            {/* Welcome Row with Stats */}
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8">
                <div>
                    <h1 className="text-4xl lg:text-5xl font-semibold text-gray-800 mb-4">Bienvenue, {name.split(" ")[0]}</h1>
                    <div className="flex flex-wrap items-center gap-3">
                        <span className="crx-label">Normal</span>
                        <div className="crx-pill-dark px-4 py-1.5 rounded-full text-sm">{Math.round((biomarkers.filter((b: any) => b.status === "normal").length / (biomarkers.length || 1)) * 100)}%</div>
                        <div className="crx-pill-yellow px-4 py-1.5 rounded-full text-sm">{100 - Math.round((biomarkers.filter((b: any) => b.status === "normal").length / (biomarkers.length || 1)) * 100)}%</div>
                        <span className="crx-label ml-1">Hors normes</span>
                        <div className="hidden sm:block w-32 h-1.5 bg-gray-200 rounded-full overflow-hidden ml-3">
                            <div className="h-full bg-gradient-to-r from-gray-700 to-yellow-500 rounded-full" style={{ width: `${Math.round((biomarkers.filter((b: any) => b.status === "normal").length / (biomarkers.length || 1)) * 100)}%` }} />
                        </div>
                        <div className="crx-glass-pill px-4 py-1.5 rounded-full text-sm text-gray-600">{totalReports} rapports</div>
                    </div>
                </div>
                {/* Big Stats - THIN font weight */}
                <div className="flex items-center gap-10">
                    <div className="text-center">
                        <div className="crx-label flex items-center gap-1.5 justify-center mb-1">
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <path d="M12 3v18M6 6c2 1 4 1 6 0s4-1 6 0M6 12c2 1 4 1 6 0s4-1 6 0M6 18c2 1 4 1 6 0s4-1 6 0" strokeLinecap="round" />
                            </svg>
                            Biomarqueurs
                        </div>
                        <p className="text-5xl crx-number text-gray-800">{uniqueBiomarkers}</p>
                    </div>
                    <div className="text-center">
                        <div className="crx-label flex items-center gap-1.5 justify-center mb-1">
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <rect x="3" y="8" width="18" height="12" rx="2" />
                                <path d="M7 8V6a2 2 0 012-2h6a2 2 0 012 2v2" />
                            </svg>
                            Rapports
                        </div>
                        <p className="text-5xl crx-number text-gray-800">{totalReports}</p>
                    </div>
                    <div className="text-center">
                        <div className="crx-label flex items-center gap-1.5 justify-center mb-1">
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <path d="M3 12h4l3-9 4 18 3-9h4" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            Alertes
                        </div>
                        <p className="text-5xl crx-number text-gray-800">{alertsCount}</p>
                    </div>
                </div>
            </div>

            {/* Main Grid */}
            <div className="grid lg:grid-cols-3 gap-6">
                {/* Left Column - 2/3 */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Recent Biomarkers with Mini Charts */}
                    <div className="crx-glass rounded-3xl p-6">
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="font-semibold text-gray-800">Biomarqueurs récents</h3>
                            <Link href="/trends" className="text-sm text-yellow-600 hover:underline">Voir tout →</Link>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {recentBiomarkers.map((b, i) => (
                                <div key={i} className="crx-glass-light rounded-2xl p-4 hover:bg-white/80 transition-all cursor-pointer">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className={`w-2 h-2 rounded-full ${b.status === "normal" ? "bg-green-500" : b.status === "high" ? "bg-yellow-500" : "bg-blue-500"}`} />
                                        <span className="text-xs text-gray-400">{b.status === "normal" ? "OK" : "!"}</span>
                                    </div>
                                    <p className="text-sm text-gray-600 mb-1 truncate">{b.name}</p>
                                    <p className="text-2xl crx-number-bold text-gray-800">{b.value}</p>
                                    <p className="text-xs text-gray-400">{b.unit}</p>
                                    {/* Mini Sparkline */}
                                    <div className="flex items-end gap-0.5 h-8 mt-3">
                                        {b.history.map((v, j) => {
                                            const max = Math.max(...b.history);
                                            const min = Math.min(...b.history);
                                            const range = max - min || 1;
                                            const height = ((v - min) / range) * 100;
                                            const isLast = j === b.history.length - 1;
                                            return (
                                                <div
                                                    key={j}
                                                    className={`flex-1 rounded-sm transition-all ${isLast ? "bg-yellow-500" : "bg-gray-200"}`}
                                                    style={{ height: `${Math.max(20, height)}%` }}
                                                />
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Upload CTA - Action Zone with warm yellow tint */}
                    <Link href="/upload" className="rounded-3xl p-6 flex items-center justify-between group transition-all hover:scale-[1.01]" style={{ background: 'linear-gradient(135deg, #FEFCE8 0%, #FEF9C3 100%)', border: '1px solid rgba(234, 179, 8, 0.2)', boxShadow: '0 4px 20px rgba(234, 179, 8, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.8)' }}>
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-yellow-400 to-yellow-500 flex items-center justify-center shadow-lg shadow-yellow-500/25">
                                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                            </div>
                            <div>
                                <p className="font-semibold text-gray-800">Importer un nouveau bilan</p>
                                <p className="text-sm text-yellow-700/70">Glissez-déposez ou cliquez pour ajouter un PDF</p>
                            </div>
                        </div>
                        <div className="crx-btn-yellow px-5 py-2.5 rounded-full text-sm font-medium group-hover:scale-105 transition-transform">
                            Importer
                        </div>
                    </Link>

                    {/* Recent Reports */}
                    <div className="crx-glass rounded-3xl overflow-hidden">
                        <div className="flex items-center justify-between p-5 border-b border-gray-100">
                            <h3 className="font-semibold text-gray-800">Rapports récents</h3>
                            <Link href="/reports" className="text-sm text-yellow-600 hover:underline">Voir tout →</Link>
                        </div>
                        <div className="divide-y divide-gray-100">
                            {reports.slice(0, 3).map((r: any, i) => (
                                <Link
                                    key={r.id}
                                    href={`/reports/${r.id}`}
                                    className="flex items-center justify-between p-4 hover:bg-white/50 transition-colors"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-yellow-50 flex items-center justify-center">
                                            <svg className="w-5 h-5 text-yellow-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" strokeLinecap="round" />
                                                <path d="M14 2v6h6M9 15l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-800 text-sm">{r.file_name}</p>
                                            <p className="text-xs text-gray-400">{r.lab_name || "Laboratoire"}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-sm text-gray-500">{formatDate(r.created_at)}</span>
                                        <span className="crx-glass-pill px-3 py-1 rounded-full text-xs text-gray-600">Voir</span>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Column - Profile Card */}
                <div className="space-y-6">
                    {/* Profile Card */}
                    <div className="crx-glass crx-hover rounded-3xl p-6 relative overflow-hidden">
                        <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-yellow-50 to-transparent" />
                        <div className="relative z-10">
                            <div className="w-20 h-20 rounded-2xl overflow-hidden mb-4 crx-avatar-glow">
                                <img
                                    src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=face"
                                    alt="Profile"
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            <h3 className="text-xl font-semibold text-gray-800 mb-0.5">{name}</h3>
                            <p className="text-gray-500 text-sm mb-4">
                                Membre {profile?.subscription_status === "premium" ? "Premium ✨" : "Gratuit"}
                            </p>
                            <div className="inline-flex items-center gap-2 crx-btn-yellow px-4 py-2 rounded-full text-sm">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                </svg>
                                {uniqueBiomarkers} biomarqueurs
                            </div>
                        </div>
                        <div className="mt-5 space-y-1 relative z-10">
                            <div className="flex items-center justify-between py-2.5 border-t border-gray-100">
                                <span className="text-sm text-gray-500">Dernière analyse</span>
                                <span className="text-sm text-gray-700">{formatDate(reports[0]?.created_at || "2025-12-15")}</span>
                            </div>
                            <div className="flex items-center justify-between py-2.5 border-t border-gray-100">
                                <span className="text-sm text-gray-500">Mon abonnement</span>
                                <span className="text-sm text-yellow-600 font-medium">
                                    {profile?.subscription_status === "premium" ? "Premium" : "Gratuit"}
                                </span>
                            </div>
                            <div className="flex items-center justify-between py-2.5 border-t border-gray-100">
                                <span className="text-sm text-gray-500">Rapports restants</span>
                                <span className="text-sm text-gray-700">
                                    {profile?.subscription_status === "premium" ? "∞" : `${3 - (profile?.uploads_count || 0)}/3`}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="crx-glass rounded-3xl p-5">
                        <h3 className="font-semibold text-gray-800 mb-4">Actions rapides</h3>
                        <div className="space-y-2">
                            <Link href="/trends" className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/50 transition-colors">
                                <div className="w-9 h-9 rounded-lg bg-yellow-100 flex items-center justify-center">
                                    <svg className="w-4 h-4 text-yellow-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M2 12h3l3-8 4 16 3-8h3" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </div>
                                <span className="text-sm text-gray-700">Voir les tendances</span>
                            </Link>
                            <Link href="/reports" className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/50 transition-colors">
                                <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center">
                                    <svg className="w-4 h-4 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <rect x="4" y="4" width="16" height="6" rx="1" strokeLinecap="round" />
                                        <rect x="4" y="14" width="16" height="6" rx="1" strokeLinecap="round" />
                                    </svg>
                                </div>
                                <span className="text-sm text-gray-700">Tous les rapports</span>
                            </Link>
                            <Link href="/settings" className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/50 transition-colors">
                                <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center">
                                    <svg className="w-4 h-4 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <circle cx="12" cy="12" r="3" /><path d="M12 2v4m0 12v4M2 12h4m12 0h4" />
                                    </svg>
                                </div>
                                <span className="text-sm text-gray-700">Paramètres</span>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            {!hasData && (
                <div className="mt-6 text-center">
                    <p className="text-gray-500 mb-4">Aucune donnée disponible</p>
                    <Link href="/upload" className="crx-btn-yellow px-6 py-3 rounded-full text-sm">Importer votre premier bilan</Link>
                </div>
            )}
        </div>
    );
}
