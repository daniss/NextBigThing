import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    // The new dashboard design has its own navigation built-in
    // So we just render children directly with minimal wrapper
    return (
        <div className="min-h-screen">
            {children}
        </div>
    );
}
