"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
    ArrowLeft,
    CheckCircle,
    XCircle,
    Send,
    Download,
    Receipt,
    Loader2,
    Calendar,
    Briefcase,
    Building2,
    PenTool
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import Link from "next/link";

interface Kwitansi {
    id: number;
    invoice_id: number;
    invoice_number: string;
    project_id: string;
    project_name: string;
    client_name: string;
    client_address: string;
    created_by_name: string;
    kwitansi_number: string;
    kwitansi_date: string;
    status: string;
    amount: number;
    purpose: string;
    notes: string;
}

const statusConfig: Record<string, { label: string; color: string }> = {
    draft: { label: "Draft", color: "bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800" },
    review: { label: "In Review", color: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/50" },
    approved: { label: "Approved", color: "bg-gold-50 text-gold-700 border-gold-200 dark:bg-gold-950/30 dark:text-gold-400 dark:border-gold-900/50" },
    sent: { label: "Sent to Client", color: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900/50" },
    paid: { label: "Paid", color: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/50" },
};

function formatCurrency(amount: number): string {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
}

function formatDate(isoString: string): string {
    if (!isoString) return "-";
    return new Date(isoString).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric"
    });
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8081";

export default function KwitansiDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { token, user } = useAuth();

    const [kwitansi, setKwitansi] = useState<Kwitansi | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const isFinance = user?.role === "user" || user?.role === "finance" || user?.role === "admin";
    const isProcon = user?.role === "manager" || user?.role === "procon" || user?.role === "admin";

    const fetchKwitansi = async () => {
        if (!token) return;
        setIsLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/kwitansi/${params.id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setKwitansi(data.data);
            } else {
                toast.error(data.message || "Gagal memuat detail kwitansi");
                router.push("/kwitansi");
            }
        } catch (error) {
            toast.error("Tidak dapat terhubung ke server");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchKwitansi();
    }, [token, params.id]);

    const handleAction = async (action: string, endpoint: string) => {
        if (!token) return;
        setActionLoading(action);
        try {
            const res = await fetch(`${API_URL}/api/kwitansi/${params.id}/${endpoint}`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                toast.success(data.message);
                fetchKwitansi();
            } else {
                toast.error(data.message || "Gagal melakukan aksi");
            }
        } catch (error) {
            toast.error("Kesalahan server");
        } finally {
            setActionLoading(null);
        }
    };

    const handleDownloadFormat = () => {
        if (!token || !kwitansi) return;
        const printWindow = window.open(`${API_URL}/api/kwitansi/${kwitansi.id}/pdf?token=${token}`, '_blank');
        if (!printWindow) {
            toast.error("Pop-up blocked. Please allow pop-ups for this site.");
        }
    };

    if (isLoading) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-gold-500" />
            </div>
        );
    }

    if (!kwitansi) return null;
    const currentStatus = statusConfig[kwitansi.status] || statusConfig.draft;

    return (
        <div className="space-y-6 max-w-5xl mx-auto pb-10">
            {/* Header / Actions */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-4">
                    <Button onClick={() => router.push("/kwitansi")} variant="ghost" size="icon" className="h-8 w-8">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold tracking-tight">{kwitansi.kwitansi_number}</h1>
                            <Badge variant="outline" className={`px-2.5 py-0.5 border ${currentStatus.color}`}>
                                {currentStatus.label}
                            </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                            Dibuat oleh <span className="font-medium text-foreground">{kwitansi.created_by_name}</span>
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {/* Finance Actions */}
                    {isFinance && kwitansi.status === "draft" && (
                        <>
                            <Button asChild variant="outline" className="bg-white/50">
                                <Link href={`/kwitansi/${kwitansi.id}/edit`}>
                                    <PenTool className="mr-2 h-4 w-4" /> Edit
                                </Link>
                            </Button>
                            <Button
                                onClick={() => handleAction("submit", "submit")}
                                disabled={actionLoading !== null}
                                className="bg-blue-600 hover:bg-blue-700 text-white"
                            >
                                {actionLoading === "submit" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                                Ajukan Approval
                            </Button>
                        </>
                    )}

                    {/* Procon Actions */}
                    {isProcon && kwitansi.status === "review" && (
                        <>
                            <Button
                                onClick={() => handleAction("reject", "reject")}
                                disabled={actionLoading !== null}
                                variant="destructive"
                            >
                                {actionLoading === "reject" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <XCircle className="mr-2 h-4 w-4" />}
                                Reject
                            </Button>
                            <Button
                                onClick={() => handleAction("approve", "approve")}
                                disabled={actionLoading !== null}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                                {actionLoading === "approve" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                                Approve
                            </Button>
                        </>
                    )}

                    {/* Finance Post-Approval Actions */}
                    {isFinance && kwitansi.status === "approved" && (
                        <Button
                            onClick={() => handleAction("mark-sent", "mark-sent")}
                            disabled={actionLoading !== null}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            {actionLoading === "mark-sent" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                            Tandai Terkirim
                        </Button>
                    )}

                    {isFinance && kwitansi.status === "sent" && (
                        <Button
                            onClick={() => handleAction("mark-paid", "mark-paid")}
                            disabled={actionLoading !== null}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                            {actionLoading === "mark-paid" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Receipt className="mr-2 h-4 w-4" />}
                            Tandai Lunas
                        </Button>
                    )}

                    {/* Shared Actions */}
                    <Button onClick={handleDownloadFormat} variant="outline" className="border-gold-500/30 text-gold-600 dark:text-gold-400 hover:bg-gold-500/10 hover:text-gold-500">
                        <Download className="mr-2 h-4 w-4" /> PDF Kwitansi
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-6">
                    {/* Main Receipt Content */}
                    <Card className="glass-card shadow-md overflow-hidden border-t-4 border-t-gold-500">
                        <CardHeader className="bg-muted/30 pb-4">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h2 className="text-xl font-bold tracking-tight text-slate-800 dark:text-slate-100 uppercase tracking-widest">
                                        Kwitansi Bukti Pembayaran
                                    </h2>
                                    <p className="text-sm font-medium mt-1 text-gold-600 dark:text-gold-400">
                                        {kwitansi.kwitansi_number}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm text-muted-foreground">Tanggal</p>
                                    <p className="font-semibold flex items-center justify-end gap-1.5">
                                        <Calendar className="h-4 w-4 text-gold-500" />
                                        {formatDate(kwitansi.kwitansi_date)}
                                    </p>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-6 space-y-6">
                            <div className="grid grid-cols-[180px_10px_1fr] items-start gap-y-4 text-sm md:text-base">
                                <div className="font-semibold text-muted-foreground pt-1">Sudah Terima Dari</div>
                                <div className="font-semibold pt-1">:</div>
                                <div className="bg-muted/30 p-3 rounded-md border border-border/50">
                                    <span className="font-bold text-lg text-foreground block">{kwitansi.client_name}</span>
                                    {kwitansi.client_address && (
                                        <span className="text-muted-foreground text-sm mt-1 block whitespace-pre-wrap">
                                            {kwitansi.client_address}
                                        </span>
                                    )}
                                </div>

                                <div className="font-semibold text-muted-foreground pt-3">Uang Sejumlah</div>
                                <div className="font-semibold pt-3">:</div>
                                <div className="pt-2">
                                    <div className="inline-block bg-gold-50/50 dark:bg-gold-900/20 border border-gold-200 dark:border-gold-800 rounded-lg px-4 py-3 shadow-inner">
                                        <span className="text-2xl font-bold font-mono text-slate-800 dark:text-slate-200">
                                            {formatCurrency(kwitansi.amount)}
                                        </span>
                                    </div>
                                </div>

                                <div className="font-semibold text-muted-foreground pt-1 lg:pt-3">Untuk Pembayaran</div>
                                <div className="font-semibold pt-1 lg:pt-3">:</div>
                                <div className="bg-muted/30 p-3 rounded-md border border-border/50 whitespace-pre-wrap leading-relaxed min-h-[80px]">
                                    {kwitansi.purpose}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {kwitansi.notes && (
                        <Card className="glass-card">
                            <CardHeader className="py-4">
                                <CardTitle className="text-base font-semibold">Catatan</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{kwitansi.notes}</p>
                            </CardContent>
                        </Card>
                    )}
                </div>

                <div className="space-y-6">
                    {/* Project Reference */}
                    <Card className="glass-card">
                        <CardHeader className="py-4 bg-muted/30 border-b border-border/50">
                            <CardTitle className="text-base font-semibold flex items-center">
                                <Building2 className="mr-2 h-4 w-4 text-gold-500" />
                                Referensi Proyek
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 space-y-4">
                            <div>
                                <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-semibold">Nomor Invoice Induk</p>
                                <p className="font-medium font-mono">
                                    <Link href={`/invoices/${kwitansi.invoice_id}`} className="text-gold-600 dark:text-gold-400 hover:underline">
                                        {kwitansi.invoice_number}
                                    </Link>
                                </p>
                            </div>
                            <Separator className="bg-border/50" />
                            <div>
                                <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-semibold">Nomor PO / Proyek</p>
                                <p className="font-medium font-mono">
                                    <Link href={`/projects/${kwitansi.project_id}`} className="text-gold-600 dark:text-gold-400 hover:underline">
                                        {kwitansi.project_id}
                                    </Link>
                                </p>
                            </div>
                            <Separator className="bg-border/50" />
                            <div>
                                <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-semibold">Nama Proyek</p>
                                <p className="text-sm font-medium line-clamp-3">{kwitansi.project_name}</p>
                            </div>
                        </CardContent>
                    </Card>

                </div>
            </div>
        </div>
    );
}
