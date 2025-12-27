// API Route for uploading lab report PDFs
// Uses node-qpdf2 for PDF decryption (requires qpdf binary installed)

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { decrypt } from "node-qpdf2";
import { writeFile, unlink, readFile, mkdir } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { randomUUID } from "crypto";

async function decryptPdf(fileBuffer: Buffer, password: string): Promise<Buffer> {
    // Create temp directory for processing
    const tempDir = join(tmpdir(), "labtrack-pdf");
    await mkdir(tempDir, { recursive: true });

    const tempId = randomUUID();
    const inputPath = join(tempDir, `${tempId}-input.pdf`);
    const outputPath = join(tempDir, `${tempId}-output.pdf`);

    try {
        // Write encrypted PDF to temp file
        await writeFile(inputPath, fileBuffer);

        // Decrypt using qpdf
        await decrypt({
            input: inputPath,
            output: outputPath,
            password: password,
        });

        // Read decrypted PDF
        const decryptedBuffer = await readFile(outputPath);

        return decryptedBuffer;
    } finally {
        // Clean up temp files
        try {
            await unlink(inputPath);
            await unlink(outputPath);
        } catch {
            // Ignore cleanup errors
        }
    }
}

export async function POST(request: NextRequest) {
    try {
        const supabase = createClient();

        // Check auth
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
        }

        // Check upload limit for free users
        const { data: profile } = await supabase
            .from("profiles")
            .select("subscription_status, uploads_count")
            .eq("id", user.id)
            .single();

        if (profile?.subscription_status === "free" && (profile?.uploads_count || 0) >= 3) {
            return NextResponse.json(
                { error: "Limite d'imports atteinte. Passez à Premium pour continuer." },
                { status: 403 }
            );
        }

        // Get file and password from form data
        const formData = await request.formData();
        const file = formData.get("file") as File | null;
        const password = formData.get("password") as string | null;

        if (!file) {
            return NextResponse.json({ error: "Aucun fichier fourni" }, { status: 400 });
        }

        if (!file.name.toLowerCase().endsWith(".pdf")) {
            return NextResponse.json({ error: "Seuls les fichiers PDF sont acceptés" }, { status: 400 });
        }

        if (file.size > 10 * 1024 * 1024) {
            return NextResponse.json({ error: "Le fichier ne doit pas dépasser 10 Mo" }, { status: 400 });
        }

        // Get file buffer
        const fileBuffer = Buffer.from(await file.arrayBuffer());
        let pdfToUpload: Buffer = fileBuffer;

        // If password provided, decrypt the PDF
        if (password && password.trim()) {
            console.log("[Upload] Decrypting PDF with provided password...");
            try {
                pdfToUpload = await decryptPdf(fileBuffer, password.trim());
                console.log("[Upload] PDF decrypted successfully, size:", pdfToUpload.length);
            } catch (decryptError: any) {
                console.error("[Upload] PDF decryption failed:", decryptError.message);
                return NextResponse.json(
                    { error: "Impossible de déchiffrer le PDF. Vérifiez le mot de passe." },
                    { status: 400 }
                );
            }
        }

        // Upload (decrypted) PDF to Supabase Storage
        const filePath = `${user.id}/${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage
            .from("lab-reports")
            .upload(filePath, pdfToUpload, {
                contentType: "application/pdf",
            });

        if (uploadError) {
            console.error("Upload error:", uploadError);
            return NextResponse.json({ error: "Échec de l'upload" }, { status: 500 });
        }

        // Create lab_report record
        const { data: report, error: insertError } = await supabase
            .from("lab_reports")
            .insert({
                user_id: user.id,
                file_name: file.name,
                file_path: filePath,
                processing_status: "pending",
            })
            .select()
            .single();

        if (insertError) {
            console.error("Insert error:", insertError);
            // Clean up uploaded file
            await supabase.storage.from("lab-reports").remove([filePath]);
            return NextResponse.json({ error: "Erreur base de données" }, { status: 500 });
        }

        // Increment upload count
        await supabase
            .from("profiles")
            .update({ uploads_count: (profile?.uploads_count || 0) + 1 })
            .eq("id", user.id);

        // Trigger Edge Function for processing (use admin client to bypass JWT)
        // Note: password is no longer sent - PDF is already decrypted
        const adminSupabase = createAdminClient();
        const { error: functionError } = await adminSupabase.functions.invoke("process-pdf", {
            body: { reportId: report.id, filePath },
        });

        if (functionError) {
            console.error("Function invocation error:", functionError);
            // Update status to failed if Edge Function couldn't be triggered
            await supabase
                .from("lab_reports")
                .update({ processing_status: "failed" })
                .eq("id", report.id);
        }

        return NextResponse.json({
            success: true,
            reportId: report.id,
            message: "Bilan importé avec succès. Traitement en cours...",
        });

    } catch (error) {
        console.error("Upload route error:", error);
        return NextResponse.json(
            { error: "Erreur serveur" },
            { status: 500 }
        );
    }
}
