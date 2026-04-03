"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

// ─── Page meta ────────────────────────────────────────────────────────────────
const PAGE_META: Record<string, { icon: React.ReactNode; description: string }> = {
    dashboard: {
        description: "System overview and recent activity",
        icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zm0 9.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zm9.75-9.75A2.25 2.25 0 0115.75 3.75H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zm0 9.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"
                />
            </svg>
        ),
    },
    jobs: {
        description: "View and manage all submission jobs",
        icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
            </svg>
        ),
    },
    pricing: {
        description: "Manage categories and base prices",
        icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z"
                />
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
            </svg>
        ),
    },
    upsells: {
        description: "Configure add-on services for checkout",
        icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        ),
    },
    prompts: {
        description: "Edit prompts and instructions",
        icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
            </svg>
        ),
    },
    settings: {
        description: "System configuration and limits",
        icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"
                />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
        ),
    },
};

const FALLBACK_META = {
    description: "Admin panel",
    icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9h16.5m-16.5 6.75h16.5" />
        </svg>
    ),
};

export function AdminHeader() {
    const pathname = usePathname();
    const [adminEmail, setAdminEmail] = useState<string | null>(null);
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        async function fetchMe() {
            try {
                const res = await fetch("/api/admin/auth/me");
                if (res.ok) {
                    const data = await res.json();
                    setAdminEmail(data.user.email);
                }
            } catch {}
        }
        fetchMe();
        const tick = setInterval(() => setTime(new Date()), 60_000);
        return () => clearInterval(tick);
    }, []);

    const segment = pathname.split("/").filter(Boolean).pop() ?? "dashboard";
    const title = segment.charAt(0).toUpperCase() + segment.slice(1);
    const meta = PAGE_META[segment] ?? FALLBACK_META;

    const initials = adminEmail ? adminEmail.split("@")[0].slice(0, 2).toUpperCase() : "—";

    const dateStr = time.toLocaleDateString("en-GB", {
        weekday: "short",
        day: "numeric",
        month: "short",
    });
    const timeStr = time.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
    });

    return (
        <header className="bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 h-14">
            {/* ── Left: page identity ── */}
            <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center shrink-0 border border-teal-100">
                    {meta.icon}
                </div>
                <div className="flex items-baseline gap-2">
                    <h1 className="text-sm font-bold text-slate-900 tracking-tight">{title}</h1>
                    <span className="hidden sm:block h-3.5 w-px bg-slate-200" />
                    <span className="hidden sm:block text-xs text-slate-400">{meta.description}</span>
                </div>
            </div>

            {/* ── Right: date/time + user ── */}
            <div className="flex items-center gap-3">
                {/* Date + time */}
                <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                    <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 9v7.5"
                        />
                    </svg>
                    <span className="font-medium text-slate-600">{dateStr}</span>
                    <span className="w-px h-3 bg-slate-200" />
                    <span className="text-slate-400 tabular-nums">{timeStr}</span>
                </div>

                <span className="hidden md:block w-px h-5 bg-slate-200" />

                {/* User pill */}
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-teal-500 flex items-center justify-center shrink-0">
                        <span className="text-[10px] font-bold text-white tracking-wide">{initials}</span>
                    </div>
                    <div className="hidden sm:block">
                        <p className="text-xs font-semibold text-slate-700 max-w-40 truncate leading-none">{adminEmail ?? "Loading…"}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Administrator</p>
                    </div>
                    {/* Online indicator */}
                    <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                </div>
            </div>
        </header>
    );
}
