"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
    Plus,
    Search,
    Filter,
    FileText,
    MoreHorizontal,
    Eye,
    Pencil,
    Trash2,
    Send,
    CheckCircle2,
    Loader2,
    Download,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

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
    return new Date(isoString).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric"
    });
}

// Interfaces matching the API
interface Invoice {
    id: number;
    invoice_number: string;
    client_name: string;
    project_name: string;
    grand_total: number;
    status: string;
    invoice_date: string;
    termin_number: number;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8081";

export default function InvoicesPage() {
    const router = useRouter();
    const { token } = useAuth();
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [searchQuery, setSearchQuery] = useState("");

    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchInvoices = async () => {
        if (!token) return;
        setIsLoading(true);
        try {
            const url = new URL(`${API_URL}/api/invoices`);
            url.searchParams.append("limit", "50"); // Fetch top 50 for now
            if (statusFilter !== "all") {
                url.searchParams.append("status", statusFilter);
            }
            if (searchQuery) {
                url.searchParams.append("search", searchQuery);
            }

            const res = await fetch(url.toString(), {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (data.success) {
                setInvoices(data.data);
            } else {
                toast.error(data.message || "Gagal memuat invoice");
            }
        } catch (err) {
            console.error("Fetch invoices error:", err);
            toast.error("Tidak dapat terhubung ke server");
        } finally {
            setIsLoading(false);
        }
    };

    // Refetch when filters change
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            fetchInvoices();
        }, 300); // 300ms debounce for typing
        return () => clearTimeout(timeoutId);
    }, [statusFilter, searchQuery, token]);

    const handleStatusTransition = async (id: number, action: string) => {
        try {
            const res = await fetch(`${API_URL}/api/invoices/${id}/${action}`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                toast.success(data.message);
                fetchInvoices(); // Refresh list
            } else {
                toast.error(data.message);
            }
        } catch (err) {
            toast.error("Terjadi kesalahan sistem");
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Yakin ingin menghapus invoice draft ini?")) return;
        try {
            const res = await fetch(`${API_URL}/api/invoices/${id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                toast.success(data.message);
                fetchInvoices();
            } else {
                toast.error(data.message);
            }
        } catch (err) {
            toast.error("Terjadi kesalahan sistem");
        }
    };

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Daftar Invoice</h1>
                    <p className="text-sm text-muted-foreground">
                        Kelola data invoice dan lacak status pembayaran
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        className="bg-white/50 dark:bg-white/5"
                        onClick={() => {
                            window.open(`${API_URL}/api/export/invoices?status=${statusFilter}`, '_blank');
                        }}
                    >
                        <Download className="mr-2 h-4 w-4 text-emerald-500" />
                        Export Excel
                    </Button>
                    <Link href="/invoices/create">
                        <Button className="gold-gradient text-white shadow-lg shadow-gold-400/25 hover:shadow-gold-400/40 transition-shadow">
                            <Plus className="mr-2 h-4 w-4" />
                            Invoice Baru
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Filters */}
            <Card className="glass-card">
                <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder="Cari nomor invoice, nama klien, atau proyek..."
                                className="pl-9 bg-white/50 dark:bg-white/5"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <Select
                            value={statusFilter}
                            onValueChange={setStatusFilter}
                        >
                            <SelectTrigger className="w-full sm:w-[200px] bg-white/50 dark:bg-white/5">
                                <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
                                <SelectValue placeholder="Semua Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Semua Status</SelectItem>
                                <SelectItem value="draft">Draft</SelectItem>
                                <SelectItem value="review">In Review</SelectItem>
                                <SelectItem value="approved">Approved</SelectItem>
                                <SelectItem value="sent">Sent</SelectItem>
                                <SelectItem value="paid">Paid</SelectItem>
                                <SelectItem value="cancelled">Cancelled</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Invoice Table */}
            <Card className="glass-card">
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent border-border/50">
                                    <TableHead className="font-semibold whitespace-nowrap">No. Invoice</TableHead>
                                    <TableHead className="font-semibold whitespace-nowrap">Klien</TableHead>
                                    <TableHead className="font-semibold hidden md:table-cell">
                                        Proyek
                                    </TableHead>
                                    <TableHead className="font-semibold hidden lg:table-cell">
                                        Termin
                                    </TableHead>
                                    <TableHead className="font-semibold text-right whitespace-nowrap">
                                        Total
                                    </TableHead>
                                    <TableHead className="font-semibold">Status</TableHead>
                                    <TableHead className="font-semibold hidden sm:table-cell whitespace-nowrap">
                                        Tanggal
                                    </TableHead>
                                    <TableHead className="w-[50px]" />
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="h-48 text-center">
                                            <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                                                <Loader2 className="h-6 w-6 animate-spin text-gold-400" />
                                                <span>Memuat data...</span>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : invoices.length === 0 ? (
                                    <TableRow>
                                        <TableCell
                                            colSpan={8}
                                            className="h-48 text-center text-muted-foreground"
                                        >
                                            {searchQuery || statusFilter !== "all"
                                                ? "Tidak ada invoice yang cocok dengan filter pencarian"
                                                : "Belum ada invoice. Buat invoice baru untuk memulai."}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    invoices.map((inv) => (
                                        <TableRow
                                            key={inv.id}
                                            className="hover:bg-muted/30 transition-colors border-border/30"
                                        >
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gold-400/10 shrink-0">
                                                        <FileText className="h-3.5 w-3.5 text-gold-400" />
                                                    </div>
                                                    <span className="font-medium text-sm whitespace-nowrap">
                                                        {inv.invoice_number}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-sm">{inv.client_name}</TableCell>
                                            <TableCell className="text-sm text-muted-foreground hidden md:table-cell line-clamp-2">
                                                {inv.project_name}
                                            </TableCell>
                                            <TableCell className="hidden lg:table-cell">
                                                <Badge variant="outline" className="text-xs whitespace-nowrap">
                                                    Termin {inv.termin_number}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right font-medium text-sm whitespace-nowrap">
                                                {formatCurrency(inv.grand_total)}
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant="outline"
                                                    className={`text-xs border-0 whitespace-nowrap ${statusConfig[inv.status]?.className || ""
                                                        }`}
                                                >
                                                    {statusConfig[inv.status]?.label || inv.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground hidden sm:table-cell whitespace-nowrap">
                                                {formatDate(inv.invoice_date)}
                                            </TableCell>
                                            <TableCell>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8"
                                                        >
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => router.push(`/invoices/${inv.id}`)}>
                                                            <Eye className="mr-2 h-4 w-4 text-slate-500" />
                                                            Lihat Detail
                                                        </DropdownMenuItem>

                                                        {inv.status === "draft" && (
                                                            <>
                                                                <DropdownMenuItem onClick={() => router.push(`/invoices/${inv.id}/edit`)}>
                                                                    <Pencil className="mr-2 h-4 w-4 text-blue-500" />
                                                                    Edit
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem onClick={() => handleStatusTransition(inv.id, "submit")}>
                                                                    <Send className="mr-2 h-4 w-4 text-amber-500" />
                                                                    Ajukan (Review)
                                                                </DropdownMenuItem>
                                                            </>
                                                        )}

                                                        {inv.status === "review" && (
                                                            <>
                                                                <DropdownMenuItem onClick={() => handleStatusTransition(inv.id, "approve")}>
                                                                    <CheckCircle2 className="mr-2 h-4 w-4 text-emerald-500" />
                                                                    Approve
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem onClick={() => handleStatusTransition(inv.id, "reject")} className="text-amber-600 focus:text-amber-600 focus:bg-amber-100 dark:focus:bg-amber-900/40">
                                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                                    Tolak (Kembalikan ke Draft)
                                                                </DropdownMenuItem>
                                                            </>
                                                        )}

                                                        {inv.status === "approved" && (
                                                            <DropdownMenuItem onClick={() => handleStatusTransition(inv.id, "mark-sent")}>
                                                                <Send className="mr-2 h-4 w-4 text-blue-500" />
                                                                Tandai Terkirim
                                                            </DropdownMenuItem>
                                                        )}

                                                        {inv.status === "sent" && (
                                                            <DropdownMenuItem onClick={() => handleStatusTransition(inv.id, "mark-paid")}>
                                                                <CheckCircle2 className="mr-2 h-4 w-4 text-emerald-500" />
                                                                Tandai Lunas
                                                            </DropdownMenuItem>
                                                        )}

                                                        <DropdownMenuSeparator />

                                                        {inv.status === "draft" && (
                                                            <DropdownMenuItem
                                                                onClick={() => handleDelete(inv.id)}
                                                                className="text-red-600 focus:text-red-600 focus:bg-red-100 dark:focus:bg-red-900/40"
                                                            >
                                                                <Trash2 className="mr-2 h-4 w-4" />
                                                                Hapus
                                                            </DropdownMenuItem>
                                                        )}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
