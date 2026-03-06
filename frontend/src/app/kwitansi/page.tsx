"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
    Search,
    Filter,
    Receipt,
    Plus,
    Eye,
    MoreHorizontal,
    Loader2,
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
import Link from "next/link";

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

interface Kwitansi {
    id: number;
    kwitansi_number: string;
    client_name: string;
    project_name: string;
    amount: number;
    status: string;
    kwitansi_date: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8081";

export default function KwitansiListPage() {
    const router = useRouter();
    const { token } = useAuth();

    const [kwitansis, setKwitansis] = useState<Kwitansi[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [searchQuery, setSearchQuery] = useState("");

    const fetchKwitansis = async () => {
        if (!token) return;
        setIsLoading(true);
        try {
            const queryParams = new URLSearchParams();
            if (statusFilter !== "all") queryParams.append("status", statusFilter);
            if (searchQuery) queryParams.append("search", searchQuery);

            const res = await fetch(`${API_URL}/api/kwitansi?${queryParams.toString()}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const data = await res.json();
            if (data.success) {
                setKwitansis(data.data || []);
            } else {
                toast.error(data.message || "Gagal memuat daftar kwitansi");
            }
        } catch (error) {
            toast.error("Tidak dapat terhubung ke server");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchKwitansis();
    }, [token, statusFilter]);

    // Delay search to avoid spamming
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchKwitansis();
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Kwitansi</h1>
                    <p className="text-sm text-muted-foreground">
                        Kelola data kwitansi per proyek secara independen
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button asChild className="bg-gold-500 hover:bg-gold-600 text-white">
                        <Link href="/kwitansi/create">
                            <Plus className="mr-2 h-4 w-4" />
                            Buat Kwitansi
                        </Link>
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <Card className="glass-card">
                <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder="Cari No. Kwitansi atau Nama Klien..."
                                className="pl-9 bg-white/50 dark:bg-white/5 border-border/50"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <Filter className="h-4 w-4 text-muted-foreground" />
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="w-[160px] bg-white/50 dark:bg-white/5 border-border/50">
                                    <SelectValue placeholder="Semua Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Semua Status</SelectItem>
                                    <SelectItem value="draft">Draft</SelectItem>
                                    <SelectItem value="review">In Review</SelectItem>
                                    <SelectItem value="approved">Approved</SelectItem>
                                    <SelectItem value="sent">Sent</SelectItem>
                                    <SelectItem value="paid">Paid</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Table */}
            <Card className="glass-card">
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent border-border/50">
                                    <TableHead className="font-semibold">No. Kwitansi</TableHead>
                                    <TableHead className="font-semibold">Klien / Proyek</TableHead>
                                    <TableHead className="font-semibold">Tanggal</TableHead>
                                    <TableHead className="font-semibold text-right">Nominal</TableHead>
                                    <TableHead className="font-semibold">Status</TableHead>
                                    <TableHead className="text-right font-semibold">Aksi</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-48 text-center">
                                            <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                                                <Loader2 className="h-6 w-6 animate-spin text-gold-400" />
                                                <span>Memuat data kwitansi...</span>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : kwitansis.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-48 text-center text-muted-foreground">
                                            <Receipt className="mx-auto h-12 w-12 text-muted-foreground/30 mb-3" />
                                            {searchQuery || statusFilter !== "all"
                                                ? "Tidak ada kwitansi yang cocok dengan filter"
                                                : "Belum ada kwitansi yang dibuat"}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    kwitansis.map((kwi) => {
                                        const config = statusConfig[kwi.status] || statusConfig.draft;
                                        return (
                                            <TableRow key={kwi.id} className="hover:bg-muted/30 transition-colors border-border/30">
                                                <TableCell className="font-medium">
                                                    {kwi.kwitansi_number}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="font-semibold">{kwi.client_name}</div>
                                                    <div className="text-xs text-muted-foreground truncate max-w-[200px]" title={kwi.project_name}>
                                                        {kwi.project_name}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-sm">
                                                    {formatDate(kwi.kwitansi_date)}
                                                </TableCell>
                                                <TableCell className="text-right font-semibold">
                                                    {formatCurrency(kwi.amount)}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className={`border-0 ${config.className}`}>
                                                        {config.label}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-gold-500/10 hover:text-gold-500">
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="w-[160px]">
                                                            <DropdownMenuItem onClick={() => router.push(`/kwitansi/${kwi.id}`)}>
                                                                <Eye className="mr-2 h-4 w-4" />
                                                                Detail
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
