"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CrxNavServer } from "@/components/crx-nav-server";
import type { Profile } from "@/types";

export default function SettingsPage() {
    const router = useRouter();
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [fullName, setFullName] = useState("");
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    useEffect(() => {
        async function load() {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { router.push("/login"); return; }
            const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
            if (data) { setProfile(data); setFullName(data.full_name || ""); }
            setLoading(false);
        }
        load();
    }, [router]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault(); setSaving(true); setMessage(null);
        try {
            const supabase = createClient();
            const { error } = await supabase.from("profiles").update({ full_name: fullName }).eq("id", profile?.id);
            if (error) throw error;
            setMessage({ type: "success", text: "Profil mis à jour" });
            router.refresh();
        } catch { setMessage({ type: "error", text: "Erreur lors de la mise à jour" }); }
        finally { setSaving(false); }
    };

    const handleLogout = async () => { const supabase = createClient(); await supabase.auth.signOut(); router.push("/"); };

    if (loading) return <div className="crx-background flex items-center justify-center min-h-screen"><div className="w-8 h-8 border-4 border-gray-200 border-t-yellow-500 rounded-full animate-spin" /></div>;

    return (
        <div className="crx-background p-6 lg:p-8">
            <div className="crx-bg-shapes" aria-hidden="true" />
            <CrxNavServer activePath="/settings" />

            <div className="max-w-2xl mx-auto">
                <div className="mb-8"><h1 className="text-3xl md:text-4xl font-semibold text-gray-800 mb-1">Paramètres</h1><p className="text-gray-500">Gérez votre compte</p></div>

                {/* Profile */}
                <div className="crx-glass rounded-3xl p-6 mb-6">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-16 h-16 rounded-2xl overflow-hidden crx-avatar-glow"><img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=face" alt="Profile" className="w-full h-full object-cover" /></div>
                        <div><h2 className="font-semibold text-gray-800">{fullName}</h2><p className="text-sm text-gray-500">{profile?.email || "marie@exemple.com"}</p></div>
                    </div>
                    <form onSubmit={handleSave} className="space-y-4">
                        <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Nom complet</label><input type="text" value={fullName} onChange={e => setFullName(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20 outline-none transition-all bg-white" /></div>
                        <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label><input type="email" value={profile?.email || "marie@exemple.com"} disabled className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-400" /></div>
                        {message && <div className={`px-4 py-3 rounded-xl text-sm ${message.type === "success" ? "bg-green-50 text-green-700 border border-green-100" : "bg-red-50 text-red-700 border border-red-100"}`}>{message.text}</div>}
                        <button type="submit" disabled={saving} className="crx-btn-yellow px-5 py-2.5 rounded-full text-sm font-medium disabled:opacity-50">{saving ? "Enregistrement..." : "Enregistrer"}</button>
                    </form>
                </div>

                {/* Subscription */}
                <div className="crx-glass rounded-3xl p-6 mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-semibold text-gray-800">Abonnement</h2>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${profile?.subscription_status === "premium" ? "bg-yellow-100 text-yellow-700" : "bg-gray-100 text-gray-600"}`}>{profile?.subscription_status === "premium" ? "Premium" : "Gratuit"}</span>
                    </div>
                    <div className="space-y-3 mb-4">
                        <div className="flex items-center justify-between text-sm"><span className="text-gray-500">Imports utilisés</span><span className="font-medium text-gray-800">{profile?.uploads_count || 3} / {profile?.subscription_status === "premium" ? "∞" : "3"}</span></div>
                        <div className="w-full bg-gray-100 rounded-full h-2"><div className="bg-gradient-to-r from-yellow-400 to-yellow-500 h-2 rounded-full" style={{ width: profile?.subscription_status === "premium" ? "100%" : `${Math.min(100, ((profile?.uploads_count || 3) / 3) * 100)}%` }} /></div>
                    </div>
                    {profile?.subscription_status !== "premium" && <button className="inline-flex items-center gap-2 crx-btn-yellow px-5 py-2.5 rounded-full text-sm font-medium"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>Passer à Premium</button>}
                </div>

                {/* Export */}
                <div className="crx-glass rounded-3xl p-6 mb-6">
                    <h2 className="font-semibold text-gray-800 mb-2">Exporter mes données</h2>
                    <p className="text-sm text-gray-500 mb-4">Téléchargez toutes vos données au format CSV</p>
                    <a href="/api/export" download className="inline-flex items-center gap-2 crx-glass-pill px-5 py-2.5 rounded-full text-sm font-medium text-gray-700 hover:bg-white transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        Exporter en CSV
                    </a>
                </div>

                {/* Logout */}
                <div className="crx-glass rounded-3xl p-6">
                    <h2 className="font-semibold text-gray-800 mb-4">Session</h2>
                    <button onClick={handleLogout} className="inline-flex items-center gap-2 bg-red-50 text-red-600 px-5 py-2.5 rounded-full text-sm font-medium hover:bg-red-100 transition-colors border border-red-100"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>Déconnexion</button>
                </div>
            </div>
        </div>
    );
}
