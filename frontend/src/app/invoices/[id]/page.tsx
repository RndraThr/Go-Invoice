"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import {
    ArrowLeft,
    CheckCircle2,
    Download,
    FileText,
    Loader2,
    Pencil,
    Send,
    XCircle,
    Trash2,
    Mail,
    BadgeDollarSign,
    History,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { InvoiceAttachments } from "@/components/invoice-attachments";

interface InvoiceItem {
    id: number;
    item_code: string;
    description: string;
    quantity: number;
    unit: string;
    unit_price: number;
    total_price: number;
}

interface Invoice {
    id: number;
    invoice_number: string;
    project_id: string;
    project_name: string;
    client_name: string;
    created_by_name: string;
    invoice_date: string;
    due_date: string;
    status: string;
    subtotal: number;
    tax_rate: number;
    tax_amount: number;
    discount: number;
    grand_total: number;
    notes: string;
    termin_number: number;
    items: InvoiceItem[];
}

const statusConfig: Record<string, { label: string; className: string }> = {
    draft: {
        label: "Draft",
        className: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
    },
    review: {
        label: "In Review",
        className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    },
    approved: {
        label: "Approved",
        className: "bg-gold-100 text-gold-700 dark:bg-gold-900/30 dark:text-gold-400",
    },
    sent: {
        label: "Sent",
        className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    },
    paid: {
        label: "Paid",
        className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    },
    cancelled: {
        label: "Cancelled",
        className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    },
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
        month: "short",
        year: "numeric"
    });
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8081";

export default function InvoiceDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { token } = useAuth();

    const [invoice, setInvoice] = useState<Invoice | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isActioning, setIsActioning] = useState(false);
    const [auditLogs, setAuditLogs] = useState<any[]>([]);

    useEffect(() => {
        if (!token || !params.id) return;

        const fetchInvoice = async () => {
            try {
                const res = await fetch(`${API_URL}/api/invoices/${params.id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const data = await res.json();
                if (data.success) {
                    setInvoice(data.data);
                } else {
                    toast.error(data.message || "Gagal memuat detail invoice");
                    router.push("/invoices");
                }
            } catch (err) {
                toast.error("Tidak dapat terhubung ke server");
            } finally {
                setIsLoading(false);
            }
        };

        fetchInvoice();

        // Fetch audit logs
        const fetchLogs = async () => {
            try {
                const res = await fetch(`${API_URL}/api/invoices/${params.id}/audit-logs`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const data = await res.json();
                if (data.success) setAuditLogs(data.data || []);
            } catch (e) { /* ignore */ }
        };
        fetchLogs();
    }, [token, params.id, router]);

    const handleStatusAction = async (action: "submit" | "approve" | "reject" | "mark-sent" | "mark-paid") => {
        if (!invoice) return;
        setIsActioning(true);

        try {
            const res = await fetch(`${API_URL}/api/invoices/${invoice.id}/${action}`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();

            if (data.success) {
                toast.success(data.message);
                // Refresh data manually or reload
                const refreshRes = await fetch(`${API_URL}/api/invoices/${invoice.id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const refreshData = await refreshRes.json();
                if (refreshData.success) {
                    setInvoice(refreshData.data);
                }
            } else {
                toast.error(data.message);
            }
        } catch (err) {
            toast.error("Terjadi kesalahan saat memproses permintaan");
        } finally {
            setIsActioning(false);
        }
    };

    const handleDelete = async () => {
        if (!invoice || !confirm("Yakin ingin menghapus invoice draft ini?")) return;
        setIsActioning(true);
        try {
            const res = await fetch(`${API_URL}/api/invoices/${invoice.id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                toast.success(data.message);
                router.push("/invoices");
            } else {
                toast.error(data.message);
                setIsActioning(false);
            }
        } catch (err) {
            toast.error("Terjadi kesalahan sistem");
            setIsActioning(false);
        }
    };

    const handleDownloadPDF = async () => {
        if (!invoice) return;
        try {
            const res = await fetch(`${API_URL}/api/invoices/${invoice.id}/pdf`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!res.ok) {
                toast.error("Gagal mengunduh PDF");
                return;
            }

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `Invoice-${invoice.invoice_number}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (err) {
            toast.error("Terjadi kesalahan sistem saat mengunduh PDF");
        }
    };


    if (isLoading) {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-gold-400" />
            </div>
        );
    }

    if (!invoice) return null;

    return (
        <div className="space-y-6 max-w-5xl mx-auto pb-12">
            {/* Header Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Link href="/invoices">
                        <Button variant="ghost" size="icon" className="rounded-lg">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold tracking-tight">
                                {invoice.invoice_number}
                            </h1>
                            <Badge
                                variant="outline"
                                className={`border-0 ${statusConfig[invoice.status]?.className || ""}`}
                            >
                                {statusConfig[invoice.status]?.label || invoice.status}
                            </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            Oleh: {invoice.created_by_name} • {formatDate(invoice.invoice_date)}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Status Actions */}
                    {invoice.status === "draft" && (
                        <>
                            <Button
                                variant="outline"
                                className="text-destructive hover:bg-destructive/10"
                                onClick={handleDelete}
                                disabled={isActioning}
                            >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Hapus
                            </Button>
                            <Button
                                className="gold-gradient text-white shadow-lg shadow-gold-400/25"
                                onClick={() => handleStatusAction("submit")}
                                disabled={isActioning}
                            >
                                {isActioning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                                Ajukan (Review)
                            </Button>
                        </>
                    )}

                    {invoice.status === "review" && (
                        <>
                            <Button
                                variant="outline"
                                className="text-amber-600 hover:bg-amber-100 dark:hover:bg-amber-900/40"
                                onClick={() => handleStatusAction("reject")}
                                disabled={isActioning}
                            >
                                <XCircle className="mr-2 h-4 w-4" />
                                Tolak Revision
                            </Button>
                            <Button
                                className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/25"
                                onClick={() => handleStatusAction("approve")}
                                disabled={isActioning}
                            >
                                {isActioning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                                Approve Invoice
                            </Button>
                        </>
                    )}

                    {/* ALWAYS show PDF download option for approved+ statuses */}
                    {["approved", "sent", "paid"].includes(invoice.status) && (
                        <>

                            <Button
                                variant="outline"
                                className="bg-white/50 dark:bg-white/5"
                                onClick={handleDownloadPDF}
                            >
                                <Download className="mr-2 h-4 w-4 text-gold-500" />
                                Unduh Invoice
                            </Button>
                        </>
                    )}

                    {/* Mark as Sent (approved -> sent) */}
                    {invoice.status === "approved" && (
                        <Button
                            className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/25"
                            onClick={() => handleStatusAction("mark-sent")}
                            disabled={isActioning}
                        >
                            {isActioning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
                            Tandai Terkirim
                        </Button>
                    )}

                    {/* Mark as Paid (sent -> paid) */}
                    {invoice.status === "sent" && (
                        <Button
                            className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/25"
                            onClick={() => handleStatusAction("mark-paid")}
                            disabled={isActioning}
                        >
                            {isActioning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BadgeDollarSign className="mr-2 h-4 w-4" />}
                            Tandai Lunas
                        </Button>
                    )}
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                    <Card className="glass-card">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="text-base flex items-center gap-2">
                                <FileText className="h-4 w-4 text-gold-400" />
                                Informasi Invoice
                            </CardTitle>
                            {invoice.status === "draft" && (
                                <Button variant="ghost" size="sm" className="text-gold-500">
                                    <Pencil className="h-4 w-4 mr-1" />
                                    Edit
                                </Button>
                            )}
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-2 gap-y-4 gap-x-8 text-sm">
                                <div>
                                    <p className="text-muted-foreground mb-1">Klien</p>
                                    <p className="font-medium">{invoice.client_name}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground mb-1">Proyek</p>
                                    <p className="font-medium">
                                        <span className="text-xs text-muted-foreground block">{invoice.project_id}</span>
                                        {invoice.project_name}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground mb-1">Tanggal Terbit</p>
                                    <p className="font-medium">{formatDate(invoice.invoice_date)}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground mb-1">Jatuh Tempo</p>
                                    <p className="font-medium text-amber-600 dark:text-amber-400">
                                        {formatDate(invoice.due_date)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground mb-1">Termin Pembayaran</p>
                                    <Badge variant="outline">Termin {invoice.termin_number}</Badge>
                                </div>
                            </div>

                            {invoice.notes && (
                                <div>
                                    <p className="text-muted-foreground mb-1 text-sm">Catatan Tambahan</p>
                                    <p className="text-sm bg-muted/40 p-3 rounded-md border border-border/50">
                                        {invoice.notes}
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="glass-card">
                        <CardHeader>
                            <CardTitle className="text-base">Detail Item Pekerjaan</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="hover:bg-transparent">
                                            <TableHead className="w-[50px] text-center">No</TableHead>
                                            <TableHead>Deskripsi</TableHead>
                                            <TableHead className="text-right">Qty</TableHead>
                                            <TableHead>Satuan</TableHead>
                                            <TableHead className="text-right">Harga Satuan</TableHead>
                                            <TableHead className="text-right">Total</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {invoice.items.map((item, index) => (
                                            <TableRow key={item.id} className="hover:bg-muted/20">
                                                <TableCell className="text-center text-muted-foreground">
                                                    {index + 1}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="font-medium">{item.description}</div>
                                                    {item.item_code !== "GENERIC" && (
                                                        <div className="text-xs text-muted-foreground">
                                                            {item.item_code}
                                                        </div>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right">{item.quantity}</TableCell>
                                                <TableCell>{item.unit}</TableCell>
                                                <TableCell className="text-right">{formatCurrency(item.unit_price)}</TableCell>
                                                <TableCell className="text-right font-medium">
                                                    {formatCurrency(item.total_price)}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Sidebar Total */}
                <div className="space-y-6">
                    <Card className="glass-card sticky top-24">
                        <CardHeader>
                            <CardTitle className="text-base">Ringkasan Biaya</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Subtotal</span>
                                <span>{formatCurrency(invoice.subtotal)}</span>
                            </div>

                            {invoice.discount > 0 && (
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Diskon</span>
                                    <span className="text-red-500">-{formatCurrency(invoice.discount)}</span>
                                </div>
                            )}

                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">PPN ({invoice.tax_rate}%)</span>
                                <span>{formatCurrency(invoice.tax_amount)}</span>
                            </div>

                            <Separator />

                            <div className="flex justify-between items-end pt-2">
                                <span className="font-medium">Grand Total</span>
                                <span className="text-2xl font-bold gold-text leading-none">
                                    {formatCurrency(invoice.grand_total)}
                                </span>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Attachments Section */}
                    {invoice && <InvoiceAttachments invoiceId={invoice.id} />}
                </div>

                {/* Audit Trail */}
                {auditLogs.length > 0 && (
                    <Card className="glass-card mt-6">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                                <History className="h-4 w-4 text-gold-400" />
                                Riwayat Aktivitas
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {auditLogs.map((log: any) => (
                                    <div key={log.id} className="flex items-start gap-3 text-sm">
                                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gold-400/10 mt-0.5">
                                            <History className="h-3 w-3 text-gold-400" />
                                        </div>
                                        <div className="flex-1">
                                            <p>
                                                <span className="font-medium">{log.user_name}</span>
                                                <span className="text-muted-foreground"> — {log.action}</span>
                                            </p>
                                            {log.details && (
                                                <p className="text-xs text-muted-foreground">{log.details}</p>
                                            )}
                                            <p className="text-xs text-muted-foreground/60">
                                                {new Date(log.created_at).toLocaleString('id-ID')}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
