"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Search, Loader2, Building2 } from "lucide-react";
import { useDebounce } from "use-debounce";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

interface Project {
    id: string;
    type: string;
    pic_po: string;
    po_in_no: string;
    company: string;
    subject: string;
    qty: number;
    po_value: number;
    payment_terms: { name: string; percentage: number }[];
    attachment_path: string;
    created_at: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8081";

function formatCurrency(amount: number): string {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
}

export default function ProjectsPage() {
    const { token } = useAuth();
    const [projects, setProjects] = useState<Project[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [debouncedSearch] = useDebounce(searchTerm, 500);

    const fetchProjects = async (search: string) => {
        setIsLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/projects?search=${search}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setProjects(data.data);
            } else {
                toast.error(data.message || "Gagal mengambil data proyek");
            }
        } catch (err) {
            toast.error("Terjadi kesalahan sistem");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (token) {
            fetchProjects(debouncedSearch);
        }
    }, [token, debouncedSearch]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Master Proyek / PO</h1>
                    <p className="text-sm text-muted-foreground">
                        Kelola Purchase Order dan termin pembayaran dari klien.
                    </p>
                </div>
                <Link href="/projects/create">
                    <Button className="gold-gradient text-white shadow-lg shadow-gold-400/25">
                        <Plus className="mr-2 h-4 w-4" />
                        PO Baru
                    </Button>
                </Link>
            </div>

            <Card className="glass-card">
                <CardContent className="p-0">
                    <div className="p-4 border-b border-border/50 flex flex-col sm:flex-row gap-4 items-center justify-between">
                        <div className="relative w-full sm:max-w-xs">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder="Cari ID, Klien, atau Deskripsi..."
                                className="pl-9 bg-white/50 dark:bg-white/5"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent">
                                    <TableHead>Project ID</TableHead>
                                    <TableHead>Tipe</TableHead>
                                    <TableHead>Klien / Deskripsi</TableHead>
                                    <TableHead className="text-right">PO Value</TableHead>
                                    <TableHead className="text-right">Aksi</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-48 text-center">
                                            <Loader2 className="h-6 w-6 animate-spin text-gold-400 mx-auto" />
                                            <p className="text-sm text-muted-foreground mt-2">Memuat daftar PO...</p>
                                        </TableCell>
                                    </TableRow>
                                ) : projects.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-48 text-center">
                                            <div className="flex flex-col items-center justify-center text-muted-foreground">
                                                <Building2 className="h-10 w-10 mb-2 opacity-20" />
                                                <p>Belum ada data Proyek/PO</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    projects.map((p) => (
                                        <TableRow key={p.id}>
                                            <TableCell className="font-medium whitespace-nowrap">
                                                {p.id}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={p.type === 'RETAIL' ? "border-blue-200 text-blue-700 bg-blue-50 dark:bg-blue-900/20" : "border-emerald-200 text-emerald-700 bg-emerald-50 dark:bg-emerald-900/20"}>
                                                    {p.type}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="font-medium text-sm">{p.company}</div>
                                                <div className="text-xs text-muted-foreground truncate max-w-xs">
                                                    {p.subject}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right font-medium">
                                                {formatCurrency(p.po_value)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Link href={`/projects/${p.id}`}>
                                                    <Button variant="ghost" size="sm" className="text-gold-500 hover:text-gold-600 hover:bg-gold-50 dark:hover:bg-gold-900/20">
                                                        Detail
                                                    </Button>
                                                </Link>
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
