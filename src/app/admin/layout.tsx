"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
    LayoutDashboard, 
    FileText, 
    MessageSquare, 
    Tags, 
    Settings, 
    LogOut,
    UserCircle
} from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    const navItems = [
        { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
        { name: "All Jobs", href: "/admin/jobs", icon: FileText },
        { name: "Categories", href: "/admin/categories", icon: Tags },
        { name: "AI Prompts", href: "/admin/prompts", icon: MessageSquare },
        { name: "Settings", href: "/admin/settings", icon: Settings },
    ];

    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* Sidebar */}
            <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col fixed h-full shadow-xl">
                <div className="h-16 flex items-center px-6 border-b border-slate-800">
                    <h1 className="text-xl font-bold text-white tracking-wide">ExplainMyLetter <span className="text-blue-500">OS</span></h1>
                </div>

                <nav className="flex-1 py-6 px-3 space-y-1">
                    {navItems.map((item) => {
                        const isActive = pathname.startsWith(item.href);
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={`flex items-center px-3 py-2.5 rounded-lg transition-colors group ${
                                    isActive 
                                    ? "bg-blue-600 text-white" 
                                    : "hover:bg-slate-800 hover:text-white"
                                }`}
                            >
                                <Icon className={`w-5 h-5 mr-3 ${isActive ? "text-white" : "text-slate-400 group-hover:text-white"}`} />
                                <span className="font-medium">{item.name}</span>
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-slate-800">
                    <button className="flex items-center px-3 py-2.5 w-full rounded-lg hover:bg-slate-800 hover:text-white transition-colors text-slate-400">
                        <LogOut className="w-5 h-5 mr-3" />
                        <span className="font-medium">Logout</span>
                    </button>
                </div>
            </aside>

            {/* Main Content Wrapper */}
            <main className="flex-1 ml-64 flex flex-col min-h-screen">
                {/* Top Header */}
                <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 shadow-sm z-10">
                    <h2 className="text-lg font-semibold text-gray-800 capitalize">
                        {pathname.split('/').pop() || 'Admin'}
                    </h2>
                    <div className="flex items-center space-x-4">
                        <span className="text-sm font-medium text-gray-600">Admin User</span>
                        <UserCircle className="w-8 h-8 text-gray-400" />
                    </div>
                </header>

                {/* Page Content */}
                <div className="p-8 flex-1 overflow-auto">
                    {children}
                </div>
            </main>
        </div>
    );
}