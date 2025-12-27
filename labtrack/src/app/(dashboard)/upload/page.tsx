"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import { createClient } from "@/lib/supabase/client";
import { CrxNavServer } from "@/components/crx-nav-server";

export default function UploadPage() {
    const router = useRouter();
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [progress, setProgress] = useState<string | null>(null);
    const [password, setPassword] = useState("");
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const processUpload = async (file: File) => {
        setError(null);
        setUploading(true);
        setProgress("Upload en cours...");

        try {
            const formData = new FormData();
            formData.append("file", file);
            if (password.trim()) {
                formData.append("password", password.trim());
            }

            const response = await fetch("/api/upload", {
                method: "POST",
                body: formData,
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || "Erreur lors de l'upload");
            }

            setProgress("Traitement IA en cours...");

            const supabase = createClient();
            let attempts = 0;
            const maxAttempts = 60;

            while (attempts < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, 1000));
                const { data: report } = await supabase
                    .from("lab_reports")
                    .select("processing_status")
                    .eq("id", result.reportId)
                    .single();

                if (report?.processing_status === "completed") {
                    setProgress("Terminé!");
                    router.push(`/reports/${result.reportId}`);
                    router.refresh();
                    return;
                } else if (report?.processing_status === "failed") {
                    throw new Error("Le traitement du PDF a échoué. Si votre fichier est protégé, n'oubliez pas d'entrer le mot de passe.");
                }
                attempts++;
            }

            setProgress("Traitement long...");
            router.push(`/reports/${result.reportId}`);
            router.refresh();

        } catch (err: any) {
            setError(err.message || "Erreur");
        } finally {
            setUploading(false);
            setProgress(null);
        }
    };

    const onDrop = useCallback((acceptedFiles: File[]) => {
        if (acceptedFiles.length === 0) return;
        const file = acceptedFiles[0];

        if (!file.name.toLowerCase().endsWith(".pdf")) {
            setError("Veuillez sélectionner un fichier PDF");
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            setError("Le fichier ne doit pas dépasser 10 Mo");
            return;
        }

        setSelectedFile(file);
        setError(null);
    }, []);

    const handleSubmit = () => {
        if (selectedFile) {
            processUpload(selectedFile);
        }
    };

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { "application/pdf": [".pdf"] },
        maxFiles: 1,
        disabled: uploading
    });

    return (
        <div className="crx-background p-6 lg:p-8">
            <div className="crx-bg-shapes" aria-hidden="true" />
            <CrxNavServer activePath="/upload" />

            <div className="max-w-2xl mx-auto">
                <div className="mb-8 text-center">
                    <h1 className="text-3xl md:text-4xl font-semibold text-gray-800 mb-2">Importer un bilan</h1>
                    <p className="text-gray-500">Glissez-déposez votre PDF ou cliquez</p>
                </div>

                <div {...getRootProps()} className={`relative border-2 border-dashed rounded-3xl p-12 text-center cursor-pointer transition-all crx-glass ${isDragActive ? "border-yellow-400 bg-yellow-50/50" : selectedFile ? "border-green-400 bg-green-50/30" : "border-gray-200 hover:border-yellow-300"} ${uploading ? "opacity-75 cursor-not-allowed" : ""}`}>
                    <input {...getInputProps()} />
                    {uploading ? (
                        <div className="space-y-4">
                            <div className="w-16 h-16 mx-auto"><svg className="w-full h-full text-yellow-500 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg></div>
                            <p className="text-lg font-medium text-gray-800">{progress}</p>
                        </div>
                    ) : selectedFile ? (
                        <div className="space-y-2">
                            <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto"><svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div>
                            <p className="text-lg font-semibold text-gray-800">{selectedFile.name}</p>
                            <p className="text-sm text-gray-500">Cliquez pour changer de fichier</p>
                        </div>
                    ) : (
                        <>
                            <div className="w-20 h-20 bg-gradient-to-br from-yellow-100 to-yellow-50 rounded-2xl flex items-center justify-center mx-auto mb-6"><svg className="w-10 h-10 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg></div>
                            <p className="text-xl font-semibold text-gray-800 mb-2">{isDragActive ? "Déposez ici" : "Glissez-déposez votre PDF"}</p>
                            <p className="text-gray-500 mb-6">ou cliquez pour parcourir</p>
                            <div className="flex items-center justify-center gap-4 text-sm text-gray-400"><span className="crx-glass-pill px-3 py-1 rounded-full">PDF uniquement</span><span className="crx-glass-pill px-3 py-1 rounded-full">Max 10 Mo</span></div>
                        </>
                    )}
                </div>

                {/* Optional Password Input */}
                <div className="mt-6 crx-glass rounded-2xl p-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Mot de passe <span className="text-gray-400 font-normal">(optionnel)</span>
                    </label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Entrez le mot de passe si votre PDF est verrouillé"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100 outline-none transition-all bg-white/50"
                        disabled={uploading}
                    />
                    <p className="mt-2 text-xs text-gray-400 flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        Souvent votre date de naissance (JJMMAAAA) ou code postal
                    </p>
                </div>

                {/* Submit Button */}
                {selectedFile && !uploading && (
                    <button
                        onClick={handleSubmit}
                        className="mt-6 w-full py-4 rounded-2xl bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-white font-semibold text-lg shadow-lg shadow-yellow-200 transition-all"
                    >
                        Importer le bilan
                    </button>
                )}

                {error && <div className="mt-4 bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm border border-red-100 flex items-center gap-2"><svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>{error}</div>}

                <div className="mt-8 crx-glass rounded-3xl p-6">
                    <h3 className="font-semibold text-gray-800 mb-4">Formats supportés</h3>
                    <div className="grid grid-cols-3 gap-4">{["Biogroup", "Synlab", "Cerballiance"].map(l => <div key={l} className="flex items-center gap-2 text-sm text-gray-600"><div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center"><svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg></div>{l}</div>)}</div>
                </div>
            </div>
        </div>
    );
}
