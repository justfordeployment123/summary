// src/app/admin/layout.tsx
// Notice: NO "use client" directive here!

import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminHeader } from "@/components/admin/AdminHeader";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-slate-100 flex" style={{ fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif" }}>
            <AdminSidebar />

            <div className="flex-1 flex flex-col min-w-0">
                <AdminHeader />
                <main className="flex-1 overflow-auto bg-slate-50">
                    {children}
                </main>
            </div>
        </div>
    );
}