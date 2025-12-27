"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
    const router = useRouter();
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault(); setLoading(true); setError(null);
        try {
            const supabase = createClient();
            const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName } } });
            if (error) throw error;
            if (data.user) await supabase.from("profiles").upsert({ id: data.user.id, email, full_name: fullName, subscription_status: "free", uploads_count: 0 });
            router.push("/dashboard"); router.refresh();
        } catch (err: any) { setError(err.message || "Erreur lors de l'inscription"); }
        finally { setLoading(false); }
    };

    return (
        <div className="animate-fade-in">
            <h1 className="text-3xl font-semibold text-gray-800 mb-2">Créer un compte</h1>
            <p className="text-gray-500 mb-8">Commencez gratuitement avec 3 imports</p>
            <form onSubmit={handleSubmit} className="space-y-5">
                <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Nom complet</label><input type="text" value={fullName} onChange={e => setFullName(e.target.value)} required placeholder="Jean Dupont" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20 outline-none transition-all bg-white" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="vous@exemple.com" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20 outline-none transition-all bg-white" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Mot de passe</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" minLength={6} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20 outline-none transition-all bg-white" /></div>
                {error && <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm border border-red-100">{error}</div>}
                <button type="submit" disabled={loading} className="w-full crx-btn-yellow py-3 rounded-full font-semibold disabled:opacity-50">{loading ? "Création..." : "Créer mon compte"}</button>
            </form>
            <p className="text-center text-gray-500 mt-6">Déjà un compte ? <Link href="/login" className="text-yellow-500 font-medium hover:underline">Se connecter</Link></p>
            <p className="text-xs text-gray-400 text-center mt-6">En créant un compte, vous acceptez nos <a href="#" className="underline">CGU</a> et notre <a href="#" className="underline">politique de confidentialité</a>.</p>
        </div>
    );
}
