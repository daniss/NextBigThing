export interface Profile {
    id: string;
    email: string;
    full_name: string | null;
    subscription_status: "free" | "premium" | "cancelled";
    subscription_id: string | null;
    uploads_count: number;
    created_at: string;
    updated_at: string;
}

export interface LabReport {
    id: string;
    user_id: string;
    file_name: string;
    file_path: string;
    lab_name: string | null;
    report_date: string | null;
    processing_status: "pending" | "processing" | "completed" | "failed";
    raw_ocr_text: string | null;
    created_at: string;
    updated_at: string;
}

export interface BiomarkerResult {
    id: string;
    lab_report_id: string;
    user_id: string;
    biomarker_name: string;
    biomarker_name_normalized: string | null;
    loinc_code: string | null;
    category: string | null;
    value: number;
    unit: string;
    unit_normalized: string | null;
    reference_min: number | null;
    reference_max: number | null;
    reference_range_text: string | null;
    status: "normal" | "low" | "high" | "critical" | null;
    is_verified: boolean;
    test_date: string;
    created_at: string;
    updated_at: string;
}

export interface BiomarkerTrend {
    biomarker_name: string;
    biomarker_name_normalized: string;
    category: string;
    data: {
        date: string;
        value: number;
        status: "normal" | "low" | "high" | "critical";
        reference_min: number | null;
        reference_max: number | null;
    }[];
}

export interface DashboardStats {
    total_biomarkers: number;
    total_reports: number;
    alerts_count: number;
    last_upload_date: string | null;
}

// API Response types
export interface UploadResponse {
    reportId: string;
    message: string;
}

export interface ProcessingResult {
    success: boolean;
    count: number;
    reportId: string;
}

// Form types
export interface LoginForm {
    email: string;
    password: string;
}

export interface SignupForm {
    email: string;
    password: string;
    full_name: string;
}
