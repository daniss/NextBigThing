import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
    title: "LabTrack - Visualisez vos analyses de sang",
    description: "Importez vos bilans sanguins, visualisez vos tendances sur 10 ans, comprenez votre santé.",
    keywords: ["analyse de sang", "biomarqueurs", "santé", "suivi médical", "laboratoire"],
    authors: [{ name: "LabTrack" }],
    openGraph: {
        title: "LabTrack - Visualisez vos analyses de sang",
        description: "Importez vos bilans sanguins, visualisez vos tendances sur 10 ans.",
        type: "website",
        locale: "fr_FR",
    },
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="fr">
            <body className="antialiased">{children}</body>
        </html>
    );
}
