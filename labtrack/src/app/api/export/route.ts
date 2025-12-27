// API Route for exporting biomarker data as CSV
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// Force dynamic rendering (uses cookies for auth)
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    try {
        const supabase = createClient();

        // Check auth
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
        }

        // Get all biomarker results for user
        const { data: biomarkers, error } = await supabase
            .from("biomarker_results")
            .select(`
        biomarker_name,
        biomarker_name_normalized,
        value,
        unit,
        reference_min,
        reference_max,
        reference_range_text,
        status,
        category,
        loinc_code,
        test_date,
        lab_reports (
          file_name,
          lab_name
        )
      `)
            .eq("user_id", user.id)
            .order("test_date", { ascending: false })
            .order("biomarker_name");

        if (error) {
            console.error("Export query error:", error);
            return NextResponse.json({ error: "Erreur de récupération des données" }, { status: 500 });
        }

        if (!biomarkers || biomarkers.length === 0) {
            return NextResponse.json({ error: "Aucune donnée à exporter" }, { status: 404 });
        }

        // Build CSV
        const headers = [
            "Date",
            "Biomarqueur",
            "Biomarqueur (normalisé)",
            "Valeur",
            "Unité",
            "Statut",
            "Référence Min",
            "Référence Max",
            "Plage de référence",
            "Catégorie",
            "Code LOINC",
            "Laboratoire",
            "Fichier source"
        ];

        const rows = biomarkers.map((b: any) => [
            b.test_date || "",
            b.biomarker_name || "",
            b.biomarker_name_normalized || "",
            b.value?.toString() || "",
            b.unit || "",
            b.status || "",
            b.reference_min?.toString() || "",
            b.reference_max?.toString() || "",
            b.reference_range_text || "",
            b.category || "",
            b.loinc_code || "",
            b.lab_reports?.lab_name || "",
            b.lab_reports?.file_name || ""
        ]);

        // Escape CSV fields
        const escapeCSV = (field: string) => {
            if (field.includes(",") || field.includes('"') || field.includes("\n")) {
                return `"${field.replace(/"/g, '""')}"`;
            }
            return field;
        };

        const csvContent = [
            headers.map(escapeCSV).join(","),
            ...rows.map(row => row.map(escapeCSV).join(","))
        ].join("\n");

        // Add BOM for Excel compatibility with French characters
        const bom = "\uFEFF";
        const csvWithBom = bom + csvContent;

        // Return as downloadable CSV
        return new NextResponse(csvWithBom, {
            status: 200,
            headers: {
                "Content-Type": "text/csv; charset=utf-8",
                "Content-Disposition": `attachment; filename="labtrack_export_${new Date().toISOString().split("T")[0]}.csv"`,
            },
        });

    } catch (error) {
        console.error("Export route error:", error);
        return NextResponse.json(
            { error: "Erreur serveur" },
            { status: 500 }
        );
    }
}
