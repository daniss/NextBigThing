// Category labels for French display
export const CATEGORY_LABELS: Record<string, string> = {
    lipid: "Lipides",
    metabolic: "Métabolique",
    hematology: "Numération sanguine",
    liver: "Foie",
    kidney: "Rein",
    thyroid: "Thyroïde",
    inflammatory: "Inflammation",
    vitamin: "Vitamines",
    mineral: "Minéraux",
    electrolyte: "Électrolytes",
    hormone: "Hormones",
    other: "Autre",
};

export const CATEGORY_COLORS: Record<string, string> = {
    lipid: "#F59E0B",
    metabolic: "#3B82F6",
    hematology: "#EF4444",
    liver: "#10B981",
    kidney: "#8B5CF6",
    thyroid: "#EC4899",
    inflammatory: "#F97316",
    vitamin: "#14B8A6",
    mineral: "#6366F1",
    electrolyte: "#06B6D4",
    hormone: "#D946EF",
    other: "#6B7280",
};

export function getCategoryLabel(category: string): string {
    return CATEGORY_LABELS[category] || category;
}

export function getCategoryColor(category: string): string {
    return CATEGORY_COLORS[category] || "#6B7280";
}
