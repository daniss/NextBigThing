import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date): string {
    return new Date(date).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
}

export function getStatusColor(status: "normal" | "low" | "high" | "critical"): string {
    const colors = {
        normal: "#10B981",
        low: "#3B82F6",
        high: "#F59E0B",
        critical: "#EF4444",
    };
    return colors[status];
}
