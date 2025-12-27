import Link from "next/link";

export default function HomePage() {
    return (
        <div className="crx-background"><div className="crx-bg-shapes" aria-hidden="true" />
            {/* Navigation */}
            <nav className="flex items-center justify-between px-6 lg:px-12 py-6">
                <div className="crx-logo px-5 py-2.5 rounded-full"><span className="font-semibold text-gray-700">LabTrack</span></div>
                <div className="flex items-center gap-4">
                    <Link href="/login" className="text-gray-500 hover:text-gray-800 font-medium transition-colors">Connexion</Link>
                    <Link href="/signup" className="crx-btn-yellow px-5 py-2.5 rounded-full text-sm transition-all">Commencer</Link>
                </div>
            </nav>

            {/* Hero */}
            <section className="px-6 lg:px-12 py-16 lg:py-24">
                <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
                    <div>
                        <div className="inline-flex items-center gap-2 crx-glass-pill px-4 py-2 rounded-full mb-6"><span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" /><span className="text-sm text-gray-500">100% conforme RGPD</span></div>
                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-semibold text-gray-800 mb-6 leading-tight">Importez vos <span className="text-yellow-500">bilans sanguins</span> en un clic</h1>
                        <p className="text-lg text-gray-500 mb-8 max-w-lg">Visualisez l&apos;évolution de vos biomarqueurs sur 10+ ans. LabTrack transforme vos PDFs de laboratoire en insights actionnables.</p>
                        <div className="flex flex-col sm:flex-row gap-4">
                            <Link href="/signup" className="crx-btn-yellow px-8 py-4 rounded-full font-semibold text-center text-lg">Essayer gratuitement</Link>
                            <Link href="#features" className="crx-glass px-8 py-4 rounded-full font-semibold text-center text-gray-700 hover:bg-white transition-all">En savoir plus</Link>
                        </div>
                        <p className="text-sm text-gray-400 mt-4">✨ 3 imports gratuits • Aucune carte requise</p>
                    </div>
                    <div className="relative">
                        <div className="crx-glass rounded-3xl p-8">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-14 h-14 rounded-2xl overflow-hidden crx-avatar-glow"><img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face" alt="Avatar" className="w-full h-full object-cover" /></div>
                                <div><p className="font-semibold text-gray-800">Marie Dupont</p><p className="text-sm text-gray-500">12 bilans importés</p></div>
                            </div>
                            <div className="space-y-3">
                                {[{ n: "Cholestérol HDL", v: "1.52", u: "g/L", s: "normal" }, { n: "Glycémie", v: "0.95", u: "g/L", s: "normal" }, { n: "Vitamine D", v: "18", u: "ng/mL", s: "low" }].map(b => (
                                    <div key={b.n} className="crx-glass-light rounded-xl p-4 flex items-center justify-between">
                                        <div className="flex items-center gap-3"><div className={`w-2.5 h-2.5 rounded-full ${b.s === "normal" ? "bg-green-500" : "bg-yellow-500"}`} /><span className="font-medium text-gray-700">{b.n}</span></div>
                                        <div><span className="crx-number-bold text-gray-800">{b.v}</span><span className="text-gray-500 text-sm ml-1">{b.u}</span></div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features */}
            <section id="features" className="px-6 lg:px-12 py-16 lg:py-24">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-12"><h2 className="text-3xl md:text-4xl font-semibold text-gray-800 mb-4">Pourquoi LabTrack ?</h2><p className="text-gray-500 max-w-2xl mx-auto">Une solution simple pour reprendre le contrôle de vos données de santé</p></div>
                    <div className="grid md:grid-cols-3 gap-6">
                        {[
                            { icon: "M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12", t: "Import PDF", d: "Glissez-déposez vos bilans Biogroup, Synlab, Cerballiance..." },
                            { icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z", t: "Tendances", d: "Visualisez l'évolution de vos biomarqueurs" },
                            { icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z", t: "Sécurisé", d: "Données hébergées en France, conformité HDS/RGPD" },
                        ].map(f => (
                            <div key={f.t} className="crx-glass crx-hover rounded-3xl p-6">
                                <div className="w-12 h-12 bg-gradient-to-br from-yellow-100 to-yellow-50 rounded-2xl flex items-center justify-center mb-4"><svg className="w-6 h-6 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={f.icon} /></svg></div>
                                <h3 className="text-xl font-semibold text-gray-800 mb-2">{f.t}</h3><p className="text-gray-500">{f.d}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Pricing */}
            <section className="px-6 lg:px-12 py-16 lg:py-24">
                <div className="max-w-4xl mx-auto">
                    <div className="text-center mb-12"><h2 className="text-3xl md:text-4xl font-semibold text-gray-800 mb-4">Tarifs simples</h2><p className="text-gray-500">Commencez gratuitement, passez à Premium quand vous êtes prêt</p></div>
                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="crx-glass rounded-3xl p-8">
                            <h3 className="text-xl font-semibold text-gray-800 mb-2">Gratuit</h3><p className="text-4xl crx-number text-gray-800 mb-4">0€</p>
                            <ul className="space-y-3 mb-8 text-gray-500">{["3 imports de bilans", "Visualisation des tendances", "Export CSV"].map(t => <li key={t} className="flex items-center gap-2"><svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>{t}</li>)}</ul>
                            <Link href="/signup" className="block w-full crx-glass text-center py-3 rounded-full font-semibold text-gray-700 hover:bg-white transition-all">Commencer</Link>
                        </div>
                        <div className="crx-glass rounded-3xl p-8 border-2 border-yellow-400 relative">
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 crx-pill-yellow px-4 py-1 rounded-full text-xs">Populaire</div>
                            <h3 className="text-xl font-semibold text-gray-800 mb-2">Premium</h3><p className="text-4xl crx-number text-gray-800 mb-1">9,99€<span className="text-lg font-normal text-gray-500">/mois</span></p><p className="text-sm text-gray-400 mb-4">ou 99€/an</p>
                            <ul className="space-y-3 mb-8 text-gray-500">{["Imports illimités", "Historique complet", "Alertes personnalisées", "Support prioritaire"].map(t => <li key={t} className="flex items-center gap-2"><svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>{t}</li>)}</ul>
                            <Link href="/signup" className="block w-full crx-btn-yellow text-center py-3 rounded-full font-semibold">Essayer Premium</Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="px-6 lg:px-12 py-8 border-t border-gray-200">
                <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
                    <p className="text-gray-400 text-sm">© 2025 LabTrack. Tous droits réservés.</p>
                    <div className="flex items-center gap-6 text-sm text-gray-400">{["Confidentialité", "CGU", "Contact"].map(t => <a key={t} href="#" className="hover:text-gray-600 transition-colors">{t}</a>)}</div>
                </div>
            </footer>
        </div>
    );
}
