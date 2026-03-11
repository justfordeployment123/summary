"use client";

import { useEffect, useState } from "react";
import { CreditCard, FileStack, CheckCircle, TrendingUp, AlertCircle } from "lucide-react";

// Types matching your API response
interface DashboardData {
    metrics: {
        totalRevenue: string;
        totalJobs: number;
        paidJobs: number;
        failedJobs: number;
        conversionRate: string;
    };
    recentJobs: Array<{
        _id: string;
        user_email: string;
        category_name?: string;
        status: string;
        created_at: string;
    }>;
}

export default function AdminDashboard() {
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchDashboard() {
            try {
                const res = await fetch('/api/admin/dashboard');
                if (!res.ok) throw new Error("Failed to fetch dashboard data");
                const json = await res.json();
                setData(json);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }
        fetchDashboard();
    }, []);

    if (loading) return <div className="flex h-full items-center justify-center text-lg font-medium text-gray-500 animate-pulse">Loading dashboard...</div>;
    if (error) return <div className="text-red-500 font-bold bg-red-50 p-4 rounded-lg border border-red-200">{error}</div>;
    if (!data) return null;

    // Helper to colorize status badges
    const getStatusBadge = (status: string) => {
        const baseStyle = "px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full";
        switch (status) {
            case "COMPLETED":
                return <span className={`${baseStyle} bg-green-100 text-green-800`}>Paid & Completed</span>;
            case "PAYMENT_CONFIRMED":
            case "PAID_BREAKDOWN_GENERATING":
                return <span className={`${baseStyle} bg-blue-100 text-blue-800`}>Processing Paid</span>;
            case "AWAITING_PAYMENT":
                return <span className={`${baseStyle} bg-yellow-100 text-yellow-800`}>Awaiting Payment</span>;
            case "OCR_FAILED":
            case "FAILED":
                return <span className={`${baseStyle} bg-red-100 text-red-800`}>Failed</span>;
            default:
                return <span className={`${baseStyle} bg-gray-100 text-gray-800`}>{status.replace(/_/g, ' ')}</span>;
        }
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-fade-in">
            
            {/* Top Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard 
                    title="Total Revenue" 
                    value={data.metrics.totalRevenue} 
                    icon={<CreditCard className="w-6 h-6 text-green-600" />} 
                    bgColor="bg-green-50"
                />
                <MetricCard 
                    title="Total Uploads" 
                    value={data.metrics.totalJobs.toString()} 
                    icon={<FileStack className="w-6 h-6 text-blue-600" />} 
                    bgColor="bg-blue-50"
                />
                <MetricCard 
                    title="Conversion Rate" 
                    value={data.metrics.conversionRate} 
                    icon={<TrendingUp className="w-6 h-6 text-indigo-600" />} 
                    bgColor="bg-indigo-50"
                />
                <MetricCard 
                    title="Failed Jobs" 
                    value={data.metrics.failedJobs.toString()} 
                    icon={<AlertCircle className="w-6 h-6 text-red-600" />} 
                    bgColor="bg-red-50"
                />
            </div>

            {/* Recent Jobs Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                    <h3 className="text-lg leading-6 font-bold text-gray-900">Recent Jobs</h3>
                    <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">View all</button>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-white">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Email</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Category</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {data.recentJobs.map((job) => (
                                <tr key={job._id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {job.user_email || "Anonymous"}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {job.category_name || "Unknown"}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {getStatusBadge(job.status)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {new Date(job.created_at).toLocaleDateString()} {new Date(job.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                    </td>
                                </tr>
                            ))}
                            {data.recentJobs.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-6 py-8 text-center text-gray-500">No jobs found yet.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

// Reusable UI Component for Metric Cards
function MetricCard({ title, value, icon, bgColor }: { title: string, value: string, icon: React.ReactNode, bgColor: string }) {
    return (
        <div className="bg-white overflow-hidden shadow-sm rounded-xl border border-gray-200 p-6 flex items-center">
            <div className={`p-4 rounded-lg ${bgColor} mr-5`}>
                {icon}
            </div>
            <div>
                <dt className="text-sm font-medium text-gray-500 truncate mb-1">{title}</dt>
                <dd className="text-2xl font-extrabold text-gray-900">{value}</dd>
            </div>
        </div>
    );
}