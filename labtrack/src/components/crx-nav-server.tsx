import Link from "next/link";

interface Props {
    activePath: string;
    alertsCount?: number;
}

const navItems = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/trends", label: "Tendances" },
    { href: "/reports", label: "Rapports" },
    { href: "/upload", label: "Importer" },
    { href: "/settings", label: "Paramètres" },
];

export function CrxNavServer({ activePath, alertsCount = 0 }: Props) {
    const isActive = (href: string) => {
        if (href === "/dashboard") return activePath === "/dashboard";
        return activePath.startsWith(href);
    };

    return (
        <div className="flex items-center justify-between mb-8 relative z-10">
            {/* Logo */}
            <Link href="/dashboard" className="crx-logo px-5 py-2.5 rounded-full">
                <span className="font-semibold text-gray-700">LabTrack</span>
            </Link>

            {/* Navigation Pills */}
            <nav className="hidden md:flex items-center crx-glass-pill rounded-full p-1.5">
                {navItems.map(item => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={isActive(item.href)
                            ? "crx-pill-dark px-5 py-2 rounded-full text-sm"
                            : "text-gray-500 hover:text-gray-800 px-5 py-2 rounded-full text-sm font-medium transition-colors"
                        }
                    >
                        {item.label}
                    </Link>
                ))}
            </nav>

            {/* Right side: icons + avatar */}
            <div className="flex items-center gap-3">
                {/* Settings icon */}
                <Link href="/settings" className="crx-glass-pill p-2.5 rounded-full hover:bg-white transition-all">
                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                </Link>

                {/* Notifications icon */}
                <div className="crx-glass-pill p-2.5 rounded-full relative">
                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                    {alertsCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center font-medium">
                            {alertsCount}
                        </span>
                    )}
                </div>

                {/* Avatar */}
                <Link href="/settings" className="w-10 h-10 rounded-full overflow-hidden crx-avatar-glow">
                    <img
                        src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face"
                        alt="Avatar"
                        className="w-full h-full object-cover"
                    />
                </Link>
            </div>
        </div>
    );
}
