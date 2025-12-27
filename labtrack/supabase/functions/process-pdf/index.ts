// Supabase Edge Function for processing lab PDFs with Mistral OCR
// Deploy with: supabase functions deploy process-pdf

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PDFDocument } from "https://esm.sh/pdf-lib@1.17.1";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ProcessPDFRequest {
    reportId: string;
    filePath: string;
    password?: string;
}

interface ParsedBiomarker {
    biomarker_name: string;
    value: number;
    unit: string;
    reference_range_text?: string;
    reference_min?: number;
    reference_max?: number;
    test_date: string;
}

// French biomarker name mappings
const BIOMARKER_MAPPINGS: Record<string, { normalized: string; loinc: string; category: string }> = {
    "cholesterol total": { normalized: "Cholesterol, Total", loinc: "2093-3", category: "lipid" },
    "cholestérol total": { normalized: "Cholesterol, Total", loinc: "2093-3", category: "lipid" },
    "hdl": { normalized: "HDL Cholesterol", loinc: "2085-9", category: "lipid" },
    "ldl": { normalized: "LDL Cholesterol", loinc: "13457-7", category: "lipid" },
    "triglycérides": { normalized: "Triglycerides", loinc: "2571-8", category: "lipid" },
    "glucose": { normalized: "Glucose", loinc: "2345-7", category: "metabolic" },
    "glycémie": { normalized: "Glucose", loinc: "2345-7", category: "metabolic" },
    "hba1c": { normalized: "Hemoglobin A1c", loinc: "4548-4", category: "metabolic" },
    "hémoglobine glyquée": { normalized: "Hemoglobin A1c", loinc: "4548-4", category: "metabolic" },
    "hémoglobine": { normalized: "Hemoglobin", loinc: "718-7", category: "hematology" },
    "hématocrite": { normalized: "Hematocrit", loinc: "4544-3", category: "hematology" },
    "globules rouges": { normalized: "Red Blood Cells", loinc: "789-8", category: "hematology" },
    "globules blancs": { normalized: "White Blood Cells", loinc: "6690-2", category: "hematology" },
    "plaquettes": { normalized: "Platelets", loinc: "777-3", category: "hematology" },
    "asat": { normalized: "AST (SGOT)", loinc: "1920-8", category: "liver" },
    "alat": { normalized: "ALT (SGPT)", loinc: "1742-6", category: "liver" },
    "gamma gt": { normalized: "GGT", loinc: "2324-2", category: "liver" },
    "bilirubine": { normalized: "Bilirubin", loinc: "1975-2", category: "liver" },
    "créatinine": { normalized: "Creatinine", loinc: "2160-0", category: "kidney" },
    "urée": { normalized: "Urea/BUN", loinc: "3094-0", category: "kidney" },
    "acide urique": { normalized: "Uric Acid", loinc: "3084-1", category: "kidney" },
    "tsh": { normalized: "TSH", loinc: "3016-3", category: "thyroid" },
    "t3": { normalized: "T3", loinc: "3053-6", category: "thyroid" },
    "t4": { normalized: "T4", loinc: "3026-2", category: "thyroid" },
    "crp": { normalized: "C-Reactive Protein", loinc: "1988-5", category: "inflammatory" },
    "vitamine d": { normalized: "Vitamin D", loinc: "1989-3", category: "vitamin" },
    "vitamine b12": { normalized: "Vitamin B12", loinc: "2132-9", category: "vitamin" },
    "fer sérique": { normalized: "Iron", loinc: "2498-4", category: "mineral" },
    "ferritine": { normalized: "Ferritin", loinc: "2276-4", category: "mineral" },
};

function normalizeBiomarker(biomarker: ParsedBiomarker) {
    const nameLower = biomarker.biomarker_name.toLowerCase().trim();
    const mapping = BIOMARKER_MAPPINGS[nameLower];

    // Determine status based on reference range
    let status = "normal";
    if (biomarker.reference_min !== undefined && biomarker.value < biomarker.reference_min) {
        status = "low";
    } else if (biomarker.reference_max !== undefined && biomarker.value > biomarker.reference_max) {
        status = biomarker.value > biomarker.reference_max * 1.5 ? "critical" : "high";
    }

    return {
        biomarker_name_normalized: mapping?.normalized || biomarker.biomarker_name,
        loinc_code: mapping?.loinc || null,
        category: mapping?.category || "other",
        status,
    };
}

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const { reportId, filePath, password } = await req.json() as ProcessPDFRequest;

        if (!reportId || !filePath) {
            throw new Error("Missing reportId or filePath");
        }

        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const mistralApiKey = Deno.env.get("MISTRAL_API_KEY")!;

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // 1. Update status to processing
        await supabase
            .from("lab_reports")
            .update({ processing_status: "processing" })
            .eq("id", reportId);

        // 2. Download PDF from storage
        const { data: fileData, error: downloadError } = await supabase
            .storage
            .from("lab-reports")
            .download(filePath);

        if (downloadError) throw new Error(`Download failed: ${downloadError.message}`);

        let pdfBytes = await fileData.arrayBuffer();

        // 2.5: Try to load PDF and check if encrypted
        try {
            // First try without password to see if PDF is encrypted
            const pdfDoc = await PDFDocument.load(pdfBytes, {
                ignoreEncryption: false,
                password: password || undefined
            });

            // If we get here, PDF loaded successfully (either not encrypted or password was correct)
            const decryptedBytes = await pdfDoc.save();
            pdfBytes = decryptedBytes.buffer;
            console.log("PDF loaded successfully");
        } catch (err: any) {
            console.error("PDF Load failed:", err?.message);

            // Check if this is an encryption/password error
            const errorMsg = String(err?.message || err || "").toLowerCase();
            if (errorMsg.includes("password") || errorMsg.includes("encrypted") || errorMsg.includes("decrypt")) {
                // If no password was provided, mark as needing password
                if (!password) {
                    // Update report with password required flag
                    await supabase
                        .from("lab_reports")
                        .update({
                            processing_status: "failed",
                            raw_ocr_text: "PASSWORD_REQUIRED"
                        })
                        .eq("id", reportId);

                    return new Response(
                        JSON.stringify({ error: "Ce PDF nécessite un mot de passe.", passwordRequired: true }),
                        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                    );
                }
                // Password was provided but wrong
                throw new Error("Impossible de déchiffrer le PDF avec le mot de passe fourni.");
            }
            // Some other PDF error
            throw new Error(`Erreur de lecture du PDF: ${err?.message}`);
        }

        // 3. Convert PDF (or decrypted PDF) to base64
        const base64 = btoa(String.fromCharCode(...new Uint8Array(pdfBytes)));

        // 4. Send to Mistral OCR (using vision model for PDFs)
        const ocrResponse = await fetch("https://api.mistral.ai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${mistralApiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "pixtral-12b-2409", // Vision model for document analysis
                messages: [
                    {
                        role: "user",
                        content: [
                            {
                                type: "text",
                                text: `Tu es un expert en analyse de bilans sanguins français. Analyse ce document PDF de laboratoire et extrais TOUS les biomarqueurs.

Pour chaque biomarqueur trouvé, retourne un objet JSON avec:
- biomarker_name: nom original en français
- value: valeur numérique (nombre uniquement, pas de texte)
- unit: unité exacte comme affichée (g/L, mmol/L, UI/L, etc.)
- reference_range_text: la plage de référence comme texte (ex: "4.0 - 6.0")
- reference_min: valeur minimum de référence (nombre)
- reference_max: valeur maximum de référence (nombre)
- test_date: date du prélèvement au format YYYY-MM-DD

Retourne un JSON valide avec la structure: { "biomarkers": [...], "lab_name": "nom du labo", "report_date": "YYYY-MM-DD" }

Sois précis et exhaustif. Si tu n'es pas sûr d'une valeur, omets-la.`
                            },
                            {
                                type: "image_url",
                                image_url: {
                                    url: `data:application/pdf;base64,${base64}`
                                }
                            }
                        ]
                    }
                ],
                max_tokens: 4096,
                response_format: { type: "json_object" }
            }),
        });

        if (!ocrResponse.ok) {
            const errorText = await ocrResponse.text();
            throw new Error(`Mistral API error: ${errorText}`);
        }

        const ocrResult = await ocrResponse.json();
        const rawContent = ocrResult.choices[0]?.message?.content || "{}";

        let parsedData: { biomarkers: ParsedBiomarker[]; lab_name?: string; report_date?: string };
        try {
            parsedData = JSON.parse(rawContent);
        } catch {
            throw new Error("Failed to parse Mistral response as JSON");
        }

        const biomarkers = parsedData.biomarkers || [];

        if (biomarkers.length === 0) {
            throw new Error("No biomarkers extracted from PDF");
        }

        // 5. Get user_id from report
        const { data: report, error: reportError } = await supabase
            .from("lab_reports")
            .select("user_id")
            .eq("id", reportId)
            .single();

        if (reportError || !report) {
            throw new Error("Report not found");
        }

        // 6. Insert biomarker results with normalization
        const resultsToInsert = biomarkers.map((b: ParsedBiomarker) => ({
            lab_report_id: reportId,
            user_id: report.user_id,
            biomarker_name: b.biomarker_name,
            value: b.value,
            unit: b.unit,
            reference_range_text: b.reference_range_text || null,
            reference_min: b.reference_min || null,
            reference_max: b.reference_max || null,
            test_date: b.test_date || parsedData.report_date || new Date().toISOString().split("T")[0],
            ...normalizeBiomarker(b),
        }));

        const { error: insertError } = await supabase
            .from("biomarker_results")
            .insert(resultsToInsert);

        if (insertError) {
            throw new Error(`Insert failed: ${insertError.message}`);
        }

        // 7. Update report status and metadata
        await supabase
            .from("lab_reports")
            .update({
                processing_status: "completed",
                lab_name: parsedData.lab_name || null,
                report_date: parsedData.report_date || null,
                raw_ocr_text: rawContent.substring(0, 10000), // Limit size
            })
            .eq("id", reportId);

        return new Response(
            JSON.stringify({
                success: true,
                count: biomarkers.length,
                lab_name: parsedData.lab_name,
            }),
            {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
        );

    } catch (error) {
        console.error("Process PDF error:", error);

        // Try to update report status to failed
        try {
            const supabase = createClient(
                Deno.env.get("SUPABASE_URL")!,
                Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
            );
            const body = await req.clone().json();
            if (body?.reportId) {
                await supabase
                    .from("lab_reports")
                    .update({ processing_status: "failed" })
                    .eq("id", body.reportId);
            }
        } catch { }

        return new Response(
            JSON.stringify({ error: error.message }),
            {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
        );
    }
});
