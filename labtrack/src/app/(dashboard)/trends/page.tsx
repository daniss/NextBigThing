"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getCategoryLabel } from "@/lib/biomarkers";
import { formatDate, getStatusColor } from "@/lib/utils";
import { CrxNavServer } from "@/components/crx-nav-server";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, ReferenceArea } from "recharts";

interface Trend { biomarker_name: string; category: string | null; unit: string; reference_min: number | null; reference_max: number | null; data: { date: string; value: number; status: string }[]; }

export default function TrendsPage() {
    const [trends, setTrends] = useState<Trend[]>([]);
    const [selected, setSelected] = useState<string | null>(null);
    const [category, setCategory] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { setLoading(false); return; }
            const { data } = await supabase.from("biomarker_results").select("*").eq("user_id", user.id).order("test_date", { ascending: true });
            if (!data || data.length === 0) { setLoading(false); return; }

            const grouped: Record<string, Trend> = {};
            data.forEach(b => {
                const key = b.biomarker_name_normalized || b.biomarker_name;
                if (!grouped[key]) grouped[key] = { biomarker_name: key, category: b.category, unit: b.unit, reference_min: b.reference_min, reference_max: b.reference_max, data: [] };
                // Update reference ranges if newer entry has values (handles old entries with null refs)
                if (b.reference_min != null) grouped[key].reference_min = b.reference_min;
                if (b.reference_max != null) grouped[key].reference_max = b.reference_max;
                grouped[key].data.push({ date: b.test_date, value: b.value, status: b.status || "normal" });
            });
            const allTrends = Object.values(grouped);
            setTrends(allTrends);
            if (allTrends.length > 0) setSelected(allTrends[0].biomarker_name);
            setLoading(false);
        }
        load();
    }, []);

    const categories = Array.from(new Set(trends.map(t => t.category).filter(Boolean))) as string[];
    const filtered = trends.filter(t => !category || t.category === category);
    const current = selected ? trends.find(t => t.biomarker_name === selected) : null;

    // Get the latest status for dynamic coloring
    const latestStatus = (current?.data[current.data.length - 1]?.status || "normal") as "normal" | "low" | "high" | "critical";
    const lineColor = getStatusColor(latestStatus);

    // Compute Y-axis domain to include reference range
    const getYAxisDomain = (): [number | string, number | string] => {
        if (!current) return ["auto", "auto"];
        const values = current.data.map(d => Number(d.value));
        const dataMin = Math.min(...values);
        const dataMax = Math.max(...values);
        const refMin = current.reference_min ? Number(current.reference_min) : null;
        const refMax = current.reference_max ? Number(current.reference_max) : null;

        if (refMin != null && refMax != null) {
            // Include both data and reference range with some padding
            // Round to avoid floating point precision issues
            const min = Math.round(Math.min(dataMin, refMin) * 0.95 * 1000) / 1000;
            const max = Math.round(Math.max(dataMax, refMax) * 1.05 * 1000) / 1000;
            return [min, max];
        }
        return ["auto", "auto"];
    };

    return (
        <div className="crx-background p-6 lg:p-8">
            <div className="crx-bg-shapes" aria-hidden="true" />
            <CrxNavServer activePath="/trends" />

            <div className="mb-8"><h1 className="text-3xl md:text-4xl font-semibold text-gray-800 mb-1">Tendances</h1><p className="text-gray-500">Visualisez l&apos;évolution de vos biomarqueurs</p></div>

            {loading ? (
                <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-gray-200 border-t-yellow-500 rounded-full animate-spin" /></div>
            ) : (
                <div className="grid lg:grid-cols-3 gap-6">
                    <div className="space-y-4">
                        <div className="crx-glass rounded-3xl p-4">
                            <h3 className="font-semibold text-gray-800 mb-3">Catégories</h3>
                            <div className="flex flex-wrap gap-2">
                                <button onClick={() => setCategory(null)} className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${!category ? "crx-pill-dark" : "crx-glass-pill text-gray-500 hover:bg-white"}`}>Toutes</button>
                                {categories.map(c => <button key={c} onClick={() => setCategory(c)} className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${category === c ? "crx-pill-dark" : "crx-glass-pill text-gray-500 hover:bg-white"}`}>{getCategoryLabel(c)}</button>)}
                            </div>
                        </div>
                        <div className="crx-glass rounded-3xl overflow-hidden max-h-[500px] overflow-y-auto">
                            {filtered.map(t => {
                                const lastStatus = (t.data[t.data.length - 1]?.status || "normal") as "normal" | "low" | "high" | "critical";
                                const statusColor = getStatusColor(lastStatus);
                                return (
                                    <button key={t.biomarker_name} onClick={() => setSelected(t.biomarker_name)} className={`w-full flex items-center justify-between p-4 text-left transition-colors border-b border-gray-100 last:border-0 ${selected === t.biomarker_name ? "bg-yellow-50" : "hover:bg-white/50"}`}>
                                        <div className="flex items-center gap-3">
                                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: statusColor }} />
                                            <div><p className="font-medium text-gray-800 text-sm">{t.biomarker_name}</p><p className="text-xs text-gray-400">{t.data.length} valeurs</p></div>
                                        </div>
                                        <span className="text-sm text-gray-600">{t.data[t.data.length - 1]?.value} {t.unit}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="lg:col-span-2">
                        {current ? (
                            <div className="crx-glass rounded-3xl p-6">
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <h2 className="text-xl font-semibold text-gray-800">{current.biomarker_name}</h2>
                                        <p className="text-sm text-gray-500">{getCategoryLabel(current.category || "other")} • {current.unit}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-3xl crx-number-bold" style={{ color: lineColor }}>{current.data[current.data.length - 1]?.value}</p>
                                        <p className="text-sm text-gray-500">Dernière valeur</p>
                                    </div>
                                </div>
                                <div className="h-72">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={current.data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                                            <XAxis dataKey="date" tickFormatter={d => formatDate(d)} tick={{ fill: "#6B7280", fontSize: 12 }} />
                                            <YAxis tick={{ fill: "#6B7280", fontSize: 12 }} domain={getYAxisDomain()} />
                                            <Tooltip
                                                formatter={(v: number) => [`${v} ${current.unit}`, "Valeur"]}
                                                labelFormatter={l => formatDate(l)}
                                                contentStyle={{ borderRadius: "12px", border: "1px solid #E5E7EB", boxShadow: "0 4px 6px rgba(0,0,0,0.05)" }}
                                            />
                                            {/* Green shaded "Normal Zone" background */}
                                            {current.reference_min && current.reference_max && (
                                                <ReferenceArea
                                                    y1={current.reference_min}
                                                    y2={current.reference_max}
                                                    fill="#22C55E"
                                                    fillOpacity={0.1}
                                                    stroke="none"
                                                />
                                            )}
                                            {/* Reference lines */}
                                            {current.reference_min && <ReferenceLine y={current.reference_min} stroke="#22C55E" strokeDasharray="5 5" strokeWidth={1.5} />}
                                            {current.reference_max && <ReferenceLine y={current.reference_max} stroke="#22C55E" strokeDasharray="5 5" strokeWidth={1.5} />}
                                            {/* Dynamic colored line based on latest status */}
                                            <Line
                                                type="monotone"
                                                dataKey="value"
                                                stroke={lineColor}
                                                strokeWidth={3}
                                                dot={{ fill: lineColor, r: 5 }}
                                                activeDot={{ r: 7 }}
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                                {(current.reference_min || current.reference_max) && (
                                    <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-6 text-sm">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-3 bg-green-500/10 border border-green-500 rounded-sm" />
                                            <span className="text-gray-500">Zone normale</span>
                                        </div>
                                        {current.reference_min && <span className="text-gray-400">Min: {current.reference_min}</span>}
                                        {current.reference_max && <span className="text-gray-400">Max: {current.reference_max}</span>}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="crx-glass rounded-3xl p-12 text-center h-full flex flex-col items-center justify-center">
                                <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4"><svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" /></svg></div>
                                <h3 className="text-lg font-semibold text-gray-800 mb-2">Sélectionnez un biomarqueur</h3>
                                <p className="text-gray-500">Cliquez sur un biomarqueur à gauche</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {trends.length === 0 && !loading && (
                <div className="mt-6 text-center">
                    <p className="text-gray-500 mb-4">Aucune donnée de tendance disponible</p>
                    <Link href="/upload" className="crx-btn-yellow px-6 py-2 rounded-full">Importer un bilan</Link>
                </div>
            )}
        </div>
    );
}
