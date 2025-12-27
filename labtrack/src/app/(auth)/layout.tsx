import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
    // Check if user is already authenticated - redirect to dashboard if so
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
        redirect("/dashboard");
    }

    return (
        <div className="crx-background min-h-screen flex">
            <div className="crx-bg-shapes" aria-hidden="true" />
            <div className="flex-1 flex items-center justify-center p-8">
                <div className="w-full max-w-md">
                    <Link href="/" className="inline-block crx-logo px-5 py-2.5 rounded-full mb-8">
                        <span className="font-semibold text-gray-700">LabTrack</span>
                    </Link>
                    {children}
                </div>
            </div>
            <div className="hidden lg:flex flex-1 items-center justify-center p-8 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-yellow-50/50 via-transparent to-transparent" />
                <div className="relative crx-glass rounded-3xl p-10 max-w-lg">
                    <div className="w-16 h-16 rounded-2xl overflow-hidden mb-6 crx-avatar-glow">
                        <img
                            src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face"
                            alt="Avatar"
                            className="w-full h-full object-cover"
                        />
                    </div>
                    <h2 className="text-3xl font-semibold text-gray-800 mb-4">
                        Reprenez le contrôle de vos données de santé
                    </h2>
                    <p className="text-gray-500 mb-8">
                        Importez vos bilans sanguins et visualisez l&apos;évolution de vos biomarqueurs.
                    </p>
                    <div className="space-y-4">
                        {[
                            { i: "M5 13l4 4L19 7", t: "Import PDF automatique" },
                            { i: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z", t: "Graphiques de tendances" },
                            { i: "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z", t: "Données sécurisées" }
                        ].map((x, i) => (
                            <div key={i} className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                                    <svg className="w-4 h-4 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={x.i} />
                                    </svg>
                                </div>
                                <span className="text-gray-700">{x.t}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
