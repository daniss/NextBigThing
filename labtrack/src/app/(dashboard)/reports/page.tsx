"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatDate } from "@/lib/utils";
import { CrxNavServer } from "@/components/crx-nav-server";

interface Report {
    id: string;
    file_name: string;
    created_at: string;
    processing_status: string;
    lab_name?: string;
}

const ITEMS_PER_PAGE = 10;

function StatusBadge({ status }: { status: string }) {
    switch (status) {
        case "completed":
            return (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                    Traité
                </span>
            );
        case "processing":
            return (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 animate-pulse">
                    En cours...
                </span>
            );
        case "pending":
            return (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                    En attente
                </span>
            );
        case "failed":
            return (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                    Échec
                </span>
            );
        default:
            return (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                    {status}
                </span>
            );
    }
}

function StatusIcon({ status }: { status: string }) {
    switch (status) {
        case "completed":
            return (
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-green-50">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                </div>
            );
        case "processing":
            return (
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-yellow-50">
                    <svg className="w-6 h-6 text-yellow-600 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                </div>
            );
        case "failed":
            return (
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-red-50">
                    <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </div>
            );
        default:
            return (
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-gray-50">
                    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
            );
    }
}

export default function ReportsPage() {
    const [reports, setReports] = useState<Report[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);

    useEffect(() => {
        async function fetchReports() {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) return;

            // Get total count
            const { count } = await supabase
                .from("lab_reports")
                .select("*", { count: "exact", head: true })
                .eq("user_id", user.id);

            setTotalCount(count || 0);

            // Get paginated reports
            const from = (page - 1) * ITEMS_PER_PAGE;
            const to = from + ITEMS_PER_PAGE - 1;

            const { data } = await supabase
                .from("lab_reports")
                .select("id, file_name, created_at, processing_status, lab_name")
                .eq("user_id", user.id)
                .order("created_at", { ascending: false })
                .range(from, to);

            setReports(data || []);
            setLoading(false);
        }

        fetchReports();
    }, [page]);

    const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

    return (
        <div className="crx-background p-6 lg:p-8">
            <div className="crx-bg-shapes" aria-hidden="true" />
            <CrxNavServer activePath="/reports" />

            <div className="max-w-4xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-semibold text-gray-800 mb-1">Rapports</h1>
                        <p className="text-gray-500">
                            {totalCount > 0
                                ? `${totalCount} bilan${totalCount > 1 ? 's' : ''} importé${totalCount > 1 ? 's' : ''}`
                                : 'Tous vos bilans sanguins importés'}
                        </p>
                    </div>
                    <Link href="/upload" className="inline-flex items-center gap-2 crx-btn-yellow px-5 py-2.5 rounded-full text-sm">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Importer
                    </Link>
                </div>

                {loading ? (
                    <div className="crx-glass rounded-3xl p-12 text-center">
                        <div className="animate-spin w-8 h-8 border-4 border-yellow-500 border-t-transparent rounded-full mx-auto mb-4" />
                        <p className="text-gray-500">Chargement des rapports...</p>
                    </div>
                ) : reports.length === 0 ? (
                    <div className="crx-glass rounded-3xl p-12 text-center">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-800 mb-2">Aucun rapport</h3>
                        <p className="text-gray-500 mb-6">Importez votre premier bilan sanguin pour commencer.</p>
                        <Link href="/upload" className="inline-flex items-center gap-2 crx-btn-yellow px-6 py-3 rounded-full">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Importer un bilan
                        </Link>
                    </div>
                ) : (
                    <>
                        <div className="crx-glass rounded-3xl overflow-hidden">
                            {reports.map((r, i) => (
                                <Link
                                    key={r.id}
                                    href={`/reports/${r.id}`}
                                    className={`flex items-center justify-between p-5 hover:bg-white/50 transition-colors ${i !== reports.length - 1 ? "border-b border-gray-100" : ""}`}
                                >
                                    <div className="flex items-center gap-4">
                                        <StatusIcon status={r.processing_status} />
                                        <div>
                                            <p className="font-semibold text-gray-800">
                                                Bilan du {formatDate(r.created_at)}
                                            </p>
                                            <div className="flex items-center gap-3 text-sm text-gray-500">
                                                {r.lab_name && <span>{r.lab_name}</span>}
                                                {!r.lab_name && <span className="text-gray-400 italic">Laboratoire non détecté</span>}
                                                <StatusBadge status={r.processing_status} />
                                            </div>
                                        </div>
                                    </div>
                                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </Link>
                            ))}
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-center gap-2 mt-6">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="px-4 py-2 rounded-lg bg-white/80 border border-gray-200 text-sm font-medium text-gray-700 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    ← Précédent
                                </button>
                                <span className="px-4 py-2 text-sm text-gray-600">
                                    Page {page} sur {totalPages}
                                </span>
                                <button
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                    className="px-4 py-2 rounded-lg bg-white/80 border border-gray-200 text-sm font-medium text-gray-700 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    Suivant →
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
