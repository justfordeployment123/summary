"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export function AdminHeader() {
    const pathname = usePathname();
    const [adminEmail, setAdminEmail] = useState<string | null>(null);

    // Fetch the logged-in admin's email for the top bar
    useEffect(() => {
        async function fetchMe() {
            try {
                const res = await fetch("/api/admin/auth/me");
                if (res.ok) {
                    const data = await res.json();
                    setAdminEmail(data.user.email);
                }
            } catch (err) {
                console.error("Failed to fetch admin info");
            }
        }
        fetchMe();
    }, []);

    // Extract a nice title from the URL path
    const pathSegment = pathname.split("/").pop();
    const title = pathSegment ? pathSegment.charAt(0).toUpperCase() + pathSegment.slice(1) : "Admin";

    return (
        <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shrink-0">
            <h1 className="text-sm font-semibold text-slate-700 capitalize">{title}</h1>

            <div className="flex items-center gap-4">
                <span className="text-xs font-medium text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full">{adminEmail || "Loading..."}</span>
                <span className="text-xs text-slate-400 hidden sm:block">
                    {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                </span>
            </div>
        </header>
    );
}
