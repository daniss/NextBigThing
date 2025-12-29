// Supabase Edge Function for processing lab PDFs
// Uses Azure OCR (prebuilt-layout with markdown) + Azure OpenAI GPT-4 mini
// Version: 34 - Upgraded to API 2024-11-30 + markdown output for better table extraction

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ProcessPDFRequest {
    reportId: string;
    filePath: string;
}

interface ParsedBiomarker {
    biomarker_name: string;
    value: number;
    unit: string;
    reference_range_text?: string;
    reference_min?: number;
    reference_max?: number;
    test_date?: string;
}

const BIOMARKER_MAPPINGS: Record<string, { normalized: string; loinc: string; category: string }> = {
    "cholesterol total": { normalized: "Cholest\u00e9rol total", loinc: "2093-3", category: "lipid" },
    "cholest\u00e9rol total": { normalized: "Cholest\u00e9rol total", loinc: "2093-3", category: "lipid" },
    "hdl": { normalized: "HDL-Cholest\u00e9rol", loinc: "2085-9", category: "lipid" },
    "ldl": { normalized: "LDL-Cholest\u00e9rol", loinc: "13457-7", category: "lipid" },
    "triglyc\u00e9rides": { normalized: "Triglyc\u00e9rides", loinc: "2571-8", category: "lipid" },
    "glucose": { normalized: "Glyc\u00e9mie", loinc: "2345-7", category: "metabolic" },
    "glyc\u00e9mie": { normalized: "Glyc\u00e9mie", loinc: "2345-7", category: "metabolic" },
    "hba1c": { normalized: "H\u00e9moglobine glyqu\u00e9e (HbA1c)", loinc: "4548-4", category: "metabolic" },
    "h\u00e9moglobine": { normalized: "H\u00e9moglobine", loinc: "718-7", category: "hematology" },
    "hemoglobine": { normalized: "H\u00e9moglobine", loinc: "718-7", category: "hematology" },
    "h\u00e9matocrite": { normalized: "H\u00e9matocrite", loinc: "4544-3", category: "hematology" },
    "hematocrite": { normalized: "H\u00e9matocrite", loinc: "4544-3", category: "hematology" },
    "globules rouges": { normalized: "Globules rouges", loinc: "789-8", category: "hematology" },
    "h\u00e9maties": { normalized: "Globules rouges", loinc: "789-8", category: "hematology" },
    "hematies": { normalized: "Globules rouges", loinc: "789-8", category: "hematology" },
    "globules blancs": { normalized: "Globules blancs", loinc: "6690-2", category: "hematology" },
    "leucocytes": { normalized: "Globules blancs", loinc: "6690-2", category: "hematology" },
    "plaquettes": { normalized: "Plaquettes", loinc: "777-3", category: "hematology" },
    "thrombocytes": { normalized: "Plaquettes", loinc: "777-3", category: "hematology" },
    "h\u00e9moglobine a1": { normalized: "H\u00e9moglobine A1", loinc: "4551-8", category: "hematology" },
    "hemoglobine a1": { normalized: "H\u00e9moglobine A1", loinc: "4551-8", category: "hematology" },
    "h\u00e9moglobine a2": { normalized: "H\u00e9moglobine A2", loinc: "4552-6", category: "hematology" },
    "hemoglobine a2": { normalized: "H\u00e9moglobine A2", loinc: "4552-6", category: "hematology" },
    "h\u00e9moglobine f": { normalized: "H\u00e9moglobine F", loinc: "4576-5", category: "hematology" },
    "hemoglobine f": { normalized: "H\u00e9moglobine F", loinc: "4576-5", category: "hematology" },
    "h\u00e9moglobine s": { normalized: "H\u00e9moglobine S", loinc: "4625-0", category: "hematology" },
    "hemoglobine s": { normalized: "H\u00e9moglobine S", loinc: "4625-0", category: "hematology" },
    "h\u00e9moglobine c": { normalized: "H\u00e9moglobine C", loinc: "4563-3", category: "hematology" },
    "hemoglobine c": { normalized: "H\u00e9moglobine C", loinc: "4563-3", category: "hematology" },
    "h\u00e9moglobine e": { normalized: "H\u00e9moglobine E", loinc: "4573-2", category: "hematology" },
    "hemoglobine e": { normalized: "H\u00e9moglobine E", loinc: "4573-2", category: "hematology" },
    "vgm": { normalized: "VGM", loinc: "787-2", category: "hematology" },
    "v.g.m": { normalized: "VGM", loinc: "787-2", category: "hematology" },
    "v.g.m.": { normalized: "VGM", loinc: "787-2", category: "hematology" },
    "tcmh": { normalized: "TCMH", loinc: "785-6", category: "hematology" },
    "t.c.m.h": { normalized: "TCMH", loinc: "785-6", category: "hematology" },
    "t.c.m.h.": { normalized: "TCMH", loinc: "785-6", category: "hematology" },
    "ccmh": { normalized: "CCMH", loinc: "786-4", category: "hematology" },
    "c.c.m.h": { normalized: "CCMH", loinc: "786-4", category: "hematology" },
    "c.c.m.h.": { normalized: "CCMH", loinc: "786-4", category: "hematology" },
    "idr": { normalized: "IDR", loinc: "788-0", category: "hematology" },
    "i.d.r": { normalized: "IDR", loinc: "788-0", category: "hematology" },
    "i.d.r.": { normalized: "IDR", loinc: "788-0", category: "hematology" },
    "r\u00e9ticulocytes": { normalized: "R\u00e9ticulocytes", loinc: "17849-1", category: "hematology" },
    "polynucl\u00e9aires neutrophiles": { normalized: "Neutrophiles", loinc: "751-8", category: "hematology" },
    "polynucleaires neutrophiles": { normalized: "Neutrophiles", loinc: "751-8", category: "hematology" },
    "neutrophiles": { normalized: "Neutrophiles", loinc: "751-8", category: "hematology" },
    "polynucl\u00e9aires \u00e9osinophiles": { normalized: "\u00c9osinophiles", loinc: "711-2", category: "hematology" },
    "polynucleaires eosinophiles": { normalized: "\u00c9osinophiles", loinc: "711-2", category: "hematology" },
    "\u00e9osinophiles": { normalized: "\u00c9osinophiles", loinc: "711-2", category: "hematology" },
    "eosinophiles": { normalized: "\u00c9osinophiles", loinc: "711-2", category: "hematology" },
    "polynucl\u00e9aires basophiles": { normalized: "Basophiles", loinc: "704-7", category: "hematology" },
    "polynucleaires basophiles": { normalized: "Basophiles", loinc: "704-7", category: "hematology" },
    "basophiles": { normalized: "Basophiles", loinc: "704-7", category: "hematology" },
    "lymphocytes": { normalized: "Lymphocytes", loinc: "731-0", category: "hematology" },
    "monocytes": { normalized: "Monocytes", loinc: "742-7", category: "hematology" },
    "asat": { normalized: "ASAT (TGO)", loinc: "1920-8", category: "liver" },
    "tgo": { normalized: "ASAT (TGO)", loinc: "1920-8", category: "liver" },
    "alat": { normalized: "ALAT (TGP)", loinc: "1742-6", category: "liver" },
    "tgp": { normalized: "ALAT (TGP)", loinc: "1742-6", category: "liver" },
    "gamma gt": { normalized: "Gamma-GT", loinc: "2324-2", category: "liver" },
    "ggt": { normalized: "Gamma-GT", loinc: "2324-2", category: "liver" },
    "phosphatases alcalines": { normalized: "Phosphatases alcalines", loinc: "6768-6", category: "liver" },
    "bilirubine": { normalized: "Bilirubine totale", loinc: "1975-2", category: "liver" },
    "cr\u00e9atinine": { normalized: "Cr\u00e9atinine", loinc: "2160-0", category: "kidney" },
    "creatinine": { normalized: "Cr\u00e9atinine", loinc: "2160-0", category: "kidney" },
    "ur\u00e9e": { normalized: "Ur\u00e9e", loinc: "3094-0", category: "kidney" },
    "acide urique": { normalized: "Acide urique", loinc: "3084-1", category: "kidney" },
    "dfg": { normalized: "DFG (Clairance)", loinc: "33914-3", category: "kidney" },
    "tsh": { normalized: "TSH", loinc: "3016-3", category: "thyroid" },
    "t3 libre": { normalized: "T3 libre", loinc: "3053-6", category: "thyroid" },
    "t4 libre": { normalized: "T4 libre", loinc: "3026-2", category: "thyroid" },
    "crp": { normalized: "CRP", loinc: "1988-5", category: "inflammatory" },
    "vs": { normalized: "Vitesse de s\u00e9dimentation", loinc: "4537-7", category: "inflammatory" },
    "sodium": { normalized: "Sodium", loinc: "2951-2", category: "electrolyte" },
    "sodium plasmatique": { normalized: "Sodium", loinc: "2951-2", category: "electrolyte" },
    "natr\u00e9mie": { normalized: "Sodium", loinc: "2951-2", category: "electrolyte" },
    "potassium": { normalized: "Potassium", loinc: "2823-3", category: "electrolyte" },
    "potassium plasmatique": { normalized: "Potassium", loinc: "2823-3", category: "electrolyte" },
    "kali\u00e9mie": { normalized: "Potassium", loinc: "2823-3", category: "electrolyte" },
    "chlore": { normalized: "Chlore", loinc: "2075-0", category: "electrolyte" },
    "bicarbonates": { normalized: "Bicarbonates", loinc: "1963-8", category: "electrolyte" },
    "calcium": { normalized: "Calcium", loinc: "17861-6", category: "electrolyte" },
    "magn\u00e9sium": { normalized: "Magn\u00e9sium", loinc: "19123-9", category: "electrolyte" },
    "phosphore": { normalized: "Phosphore", loinc: "2777-1", category: "electrolyte" },
    "vitamine d": { normalized: "Vitamine D", loinc: "1989-3", category: "vitamin" },
    "vitamine b12": { normalized: "Vitamine B12", loinc: "2132-9", category: "vitamin" },
    "folates": { normalized: "Folates (B9)", loinc: "2284-8", category: "vitamin" },
    "fer s\u00e9rique": { normalized: "Fer s\u00e9rique", loinc: "2498-4", category: "mineral" },
    "fer": { normalized: "Fer s\u00e9rique", loinc: "2498-4", category: "mineral" },
    "ferritine": { normalized: "Ferritine", loinc: "2276-4", category: "mineral" },
    "transferrine": { normalized: "Transferrine", loinc: "3034-6", category: "mineral" },
    "tp": { normalized: "TP", loinc: "5902-2", category: "coagulation" },
    "inr": { normalized: "INR", loinc: "6301-6", category: "coagulation" },
    "tca": { normalized: "TCA", loinc: "3173-2", category: "coagulation" },
    "fibrinog\u00e8ne": { normalized: "Fibrinog\u00e8ne", loinc: "3255-7", category: "coagulation" },
    "d-dim\u00e8res": { normalized: "D-Dim\u00e8res", loinc: "48065-7", category: "coagulation" },
    "psa": { normalized: "PSA total", loinc: "2857-1", category: "tumor_marker" },
    "afp": { normalized: "AFP", loinc: "1834-1", category: "tumor_marker" },
    "ace": { normalized: "ACE", loinc: "2039-6", category: "tumor_marker" },
    "ca 125": { normalized: "CA 125", loinc: "10334-1", category: "tumor_marker" },
    "beta hcg": { normalized: "B\u00eata-HCG", loinc: "21198-7", category: "hormone" },
    "cortisol": { normalized: "Cortisol", loinc: "2143-6", category: "hormone" },
    "testost\u00e9rone": { normalized: "Testost\u00e9rone", loinc: "2986-8", category: "hormone" },
    "estradiol": { normalized: "Estradiol", loinc: "2243-4", category: "hormone" },
    "troponine": { normalized: "Troponine", loinc: "6598-7", category: "cardiac" },
    "bnp": { normalized: "BNP", loinc: "30934-4", category: "cardiac" },
    "nt-probnp": { normalized: "NT-proBNP", loinc: "33762-6", category: "cardiac" },
};

function normalizeBiomarker(biomarker: ParsedBiomarker) {
    const nameLower = biomarker.biomarker_name.toLowerCase().trim();
    const mapping = BIOMARKER_MAPPINGS[nameLower];
    let status = "normal";
    if (typeof biomarker.reference_min === 'number' && biomarker.value < biomarker.reference_min) {
        status = "low";
    } else if (typeof biomarker.reference_max === 'number' && biomarker.value > biomarker.reference_max) {
        status = biomarker.value > biomarker.reference_max * 1.5 ? "critical" : "high";
    }
    return {
        biomarker_name_normalized: mapping?.normalized || biomarker.biomarker_name,
        loinc_code: mapping?.loinc || null,
        category: mapping?.category || "other",
        status,
    };
}

// Optimized prompt for markdown/HTML table input from Azure OCR
const GPT_SYSTEM_PROMPT = `Tu es un expert m\u00e9dical. Extrais TOUS les biomarqueurs du bilan sanguin en JSON.

Le texte contient des tables HTML avec les r\u00e9sultats. Chaque ligne de table = un biomarqueur.

## R\u00c8GLES
1. Extraire CHAQUE biomarqueur avec sa valeur et unit\u00e9
2. UN seul enregistrement par biomarqueur (pas de doublons)
3. Formule leucocytaire: prendre valeur absolue (G/L), pas le %
4. Cr\u00e9atinine: prendre \u00b5mol/L, pas mg/L  
5. \u00c9lectrophor\u00e8se h\u00e9moglobine: extraire H\u00e9moglobine A1 et A2 (valeurs en %)
6. Plaquettes: ne pas oublier!
7. Convertir virgules en points: "1,85" => 1.85

## FORMAT JSON
{"biomarkers":[{"biomarker_name":"Nom exact","value":12.3,"unit":"g/L","reference_range_text":"10-15","reference_min":10.0,"reference_max":15.0}],"lab_name":"Nom du labo","report_date":"YYYY-MM-DD"}`;

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    let supabase: any = null;
    let reportId: string | null = null;
    let filePath: string | null = null;

    try {
        const body = await req.json() as ProcessPDFRequest;
        reportId = body.reportId;
        filePath = body.filePath;
        if (!reportId || !filePath) throw new Error("Missing reportId or filePath");

        console.log("[0] v34 (markdown OCR), reportId:", reportId);

        supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
        const azureOcrKey = Deno.env.get("AZURE_OCR_KEY")!;
        const azureOcrEndpoint = Deno.env.get("AZURE_OCR_ENDPOINT")!;
        const azureOpenaiKey = Deno.env.get("AZURE_OPENAI_API_KEY")!;
        const azureOpenaiBase = Deno.env.get("AZURE_OPENAI_API_BASE")!;
        const azureOpenaiDeployment = Deno.env.get("AZURE_OPENAI_DEPLOYMENT_NAME")!;

        await supabase.from("lab_reports").update({ processing_status: "processing" }).eq("id", reportId);

        const { data: fileData, error: downloadError } = await supabase.storage.from("lab-reports").download(filePath);
        if (downloadError) throw new Error(`\u00c9chec t\u00e9l\u00e9chargement: ${downloadError.message}`);
        console.log("[1] PDF:", fileData.size, "bytes");

        // UPGRADED: API 2024-11-30 + markdown output for better table structure
        const analyzeUrl = `${azureOcrEndpoint}documentintelligence/documentModels/prebuilt-layout:analyze?api-version=2024-11-30&outputContentFormat=markdown`;
        const analyzeResponse = await fetch(analyzeUrl, {
            method: "POST",
            headers: { "Ocp-Apim-Subscription-Key": azureOcrKey, "Content-Type": "application/pdf" },
            body: new Uint8Array(await fileData.arrayBuffer()),
        });
        if (!analyzeResponse.ok) {
            const errText = await analyzeResponse.text();
            console.error("[OCR Error]", analyzeResponse.status, errText);
            throw new Error(`Erreur OCR: ${analyzeResponse.status}`);
        }

        const operationLocation = analyzeResponse.headers.get("operation-location")!;
        let ocrResult = null;
        for (let i = 0; i < 30; i++) {
            await new Promise(r => setTimeout(r, 2000));
            const poll = await fetch(operationLocation, { headers: { "Ocp-Apim-Subscription-Key": azureOcrKey } });
            const res = await poll.json();
            if (res.status === "succeeded") { ocrResult = res; break; }
            if (res.status === "failed") throw new Error("OCR \u00e9chou\u00e9");
        }
        if (!ocrResult) throw new Error("D\u00e9lai OCR");

        const extractedText = ocrResult.analyzeResult?.content || "";
        if (!extractedText || extractedText.length < 50) throw new Error("PDF non lisible");
        console.log("[2] OCR (markdown):", extractedText.length, "chars");
        console.log("[2b] Preview:", extractedText.substring(0, 500));

        const gptUrl = `${azureOpenaiBase}openai/deployments/${azureOpenaiDeployment}/chat/completions?api-version=2024-08-01-preview`;
        const gptResponse = await fetch(gptUrl, {
            method: "POST",
            headers: { "api-key": azureOpenaiKey, "Content-Type": "application/json" },
            body: JSON.stringify({
                messages: [
                    { role: "system", content: GPT_SYSTEM_PROMPT },
                    { role: "user", content: `Extrait TOUS les biomarqueurs de ce bilan sanguin (format markdown avec tables HTML):\n\n${extractedText}` }
                ],
                temperature: 0.1,
                response_format: { type: "json_object" }
            }),
        });

        if (!gptResponse.ok) throw new Error(`Erreur IA: ${gptResponse.status}`);

        const gptResult = await gptResponse.json();
        let parsedData: { biomarkers?: ParsedBiomarker[]; lab_name?: string; report_date?: string };
        try {
            parsedData = JSON.parse(gptResult.choices?.[0]?.message?.content || "{}");
        } catch {
            throw new Error("R\u00e9ponse IA invalide");
        }

        const validBiomarkers = (parsedData.biomarkers || []).filter(b => 
            b.biomarker_name && typeof b.value === 'number' && !isNaN(b.value)
        );
        console.log("[3] GPT:", validBiomarkers.length, "biomarkers");
        console.log("[3b] Names:", validBiomarkers.map(b => b.biomarker_name).join(", "));

        if (validBiomarkers.length === 0) throw new Error("Aucun biomarqueur");

        const { data: report } = await supabase.from("lab_reports").select("user_id").eq("id", reportId).single();
        if (!report) throw new Error("Rapport non trouv\u00e9");

        const rows = validBiomarkers.map(b => ({
            lab_report_id: reportId,
            user_id: report.user_id,
            biomarker_name: b.biomarker_name,
            value: b.value,
            unit: b.unit || null,
            reference_range_text: b.reference_range_text || null,
            reference_min: typeof b.reference_min === 'number' ? b.reference_min : null,
            reference_max: typeof b.reference_max === 'number' ? b.reference_max : null,
            test_date: b.test_date || parsedData.report_date || new Date().toISOString().split("T")[0],
            ...normalizeBiomarker(b),
        }));

        const { error: insertError } = await supabase.from("biomarker_results").insert(rows);
        if (insertError) throw new Error(`Erreur insertion: ${insertError.message}`);
        console.log("[4] Inserted:", rows.length);

        await supabase.from("lab_reports").update({
            processing_status: "completed",
            lab_name: parsedData.lab_name || null,
            report_date: parsedData.report_date || null,
            raw_ocr_text: extractedText.substring(0, 50000),
        }).eq("id", reportId);

        console.log("[5] Done!", validBiomarkers.length);
        return new Response(JSON.stringify({ success: true, biomarkers: validBiomarkers.length }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    } catch (error: any) {
        console.error("[ERROR]", error.message);
        if (supabase && reportId) {
            try {
                if (filePath) await supabase.storage.from("lab-reports").remove([filePath]);
                await supabase.from("lab_reports").delete().eq("id", reportId);
            } catch { }
        }
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
});