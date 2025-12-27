"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const redirectTo = searchParams.get("redirectTo") || "/dashboard";

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const supabase = createClient();
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            if (error) throw error;

            // Redirect to the original destination or dashboard
            router.push(redirectTo);
            router.refresh();
        } catch (err: any) {
            setError(err.message || "Erreur de connexion");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="animate-fade-in">
            <h1 className="text-3xl font-semibold text-gray-800 mb-2">Connexion</h1>
            <p className="text-gray-500 mb-8">Accédez à votre compte LabTrack</p>

            <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                    <input
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        required
                        placeholder="vous@exemple.com"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20 outline-none transition-all bg-white"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Mot de passe</label>
                    <input
                        type="password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        required
                        placeholder="••••••••"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20 outline-none transition-all bg-white"
                    />
                </div>

                {error && (
                    <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm border border-red-100">
                        {error}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full crx-btn-yellow py-3 rounded-full font-semibold disabled:opacity-50"
                >
                    {loading ? "Connexion..." : "Se connecter"}
                </button>
            </form>

            <p className="text-center text-gray-500 mt-6">
                Pas encore de compte ?{" "}
                <Link href="/signup" className="text-yellow-500 font-medium hover:underline">
                    Créer un compte
                </Link>
            </p>
        </div>
    );
}
