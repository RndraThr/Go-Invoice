"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Building2, Calendar, FileText, Trash2, Edit, Loader2, DownloadCloud } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface PaymentTerm {
    name: string;
    percentage: number;
}

interface Project {
    id: string;
    type: string;
    pic_po: string;
    po_in_no: string;
    company: string;
    subject: string;
    qty: number;
    po_value: number;
    payment_terms: PaymentTerm[];
    attachment_path: string;
    created_at: string;
    updated_at: string;
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

function formatDate(dateString: string): string {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
    }).format(date);
}

export default function ProjectDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { token } = useAuth();

    const [project, setProject] = useState<Project | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isDeleting, setIsDeleting] = useState(false);

    const projectId = params.id as string;

    useEffect(() => {
        const fetchProject = async () => {
            if (!token) return;
            try {
                const res = await fetch(`${API_URL}/api/projects/${projectId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const data = await res.json();

                if (data.success && data.data) {
                    setProject(data.data);
                } else {
                    toast.error(data.message || "Proyek tidak ditemukan");
                    router.push("/projects");
                }
            } catch (err) {
                console.error("Fetch project error:", err);
                toast.error("Terjadi kesalahan saat memuat data");
            } finally {
                setIsLoading(false);
            }
        };

        fetchProject();
    }, [projectId, token, router]);

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            const res = await fetch(`${API_URL}/api/projects/${projectId}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();

            if (data.success) {
                toast.success("Berhasil menghapus Proyek/PO");
                router.push("/projects");
            } else {
                toast.error(data.message || "Gagal menghapus proyek");
            }
        } catch (err) {
            console.error("Delete project error:", err);
            toast.error("Terjadi kesalahan sistem saat menghapus");
        } finally {
            setIsDeleting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh]">
                <Loader2 className="h-8 w-8 animate-spin text-gold-500 mb-4" />
                <p className="text-muted-foreground">Memuat detail proyek...</p>
            </div>
        );
    }

    if (!project) return null;

    return (
        <div className="space-y-6 max-w-5xl mx-auto pb-12">
            {/* Header Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Link href="/projects">
                        <Button variant="ghost" size="icon" className="rounded-lg">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold tracking-tight">{project.id}</h1>
                            <Badge variant="outline" className={project.type === 'RETAIL' ? "border-blue-200 text-blue-700 bg-blue-50 dark:bg-blue-900/20" : "border-emerald-200 text-emerald-700 bg-emerald-50 dark:bg-emerald-900/20"}>
                                {project.type}
                            </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            Terdaftar sejak {formatDate(project.created_at)}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Link href={`/projects/${projectId}/edit`}>
                        <Button variant="outline" className="text-gold-600 border-gold-200 hover:bg-gold-50">
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                        </Button>
                    </Link>
                    {project.attachment_path && (
                        <Button variant="outline" className="text-gold-600 border-gold-200 hover:bg-gold-50" onClick={() => toast.info("Fitur unduh lampiran akan segera hadir")}>
                            <DownloadCloud className="w-4 h-4 mr-2" />
                            Lampiran
                        </Button>
                    )}
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" className="bg-red-500 hover:bg-red-600 text-white">
                                <Trash2 className="w-4 h-4 mr-2" />
                                Hapus
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="glass-card sm:max-w-[425px]">
                            <AlertDialogHeader>
                                <AlertDialogTitle>Hapus Proyek / PO ini?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Tindakan ini tidak dapat dibatalkan. Menghapus Proyek PO ini secara permanen dari database.
                                    Pastikan tidak ada Invoice tagihan yang masih terhubung dengan PO ini.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Batal</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600" disabled={isDeleting}>
                                    {isDeleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                                    Hapus Permanen
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                {/* Main Information */}
                <Card className="glass-card md:col-span-2">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Building2 className="w-5 h-5 text-gold-500" />
                            Informasi Klien & Pekerjaan
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-8">
                            <div>
                                <h4 className="text-sm font-medium text-muted-foreground mb-1">Nama Perusahaan (Klien)</h4>
                                <p className="text-base font-semibold">{project.company}</p>
                            </div>
                            <div>
                                <h4 className="text-sm font-medium text-muted-foreground mb-1">Nomor PO (Klien)</h4>
                                <p className="text-base font-medium">{project.po_in_no || "-"}</p>
                            </div>
                            <div className="sm:col-span-2">
                                <h4 className="text-sm font-medium text-muted-foreground mb-1">Deskripsi Pekerjaan / Subject</h4>
                                <p className="text-base whitespace-pre-wrap">{project.subject || "-"}</p>
                            </div>
                            <div>
                                <h4 className="text-sm font-medium text-muted-foreground mb-1">PIC KSM Tanggung Jawab</h4>
                                <p className="text-base">{project.pic_po || "-"}</p>
                            </div>
                            <div>
                                <h4 className="text-sm font-medium text-muted-foreground mb-1">Kuantitas Base</h4>
                                <p className="text-base">{project.qty} Ls/Lot</p>
                            </div>
                        </div>

                        <Separator className="bg-gold-500/10" />

                        <div>
                            <h4 className="text-sm font-medium text-muted-foreground mb-3">Nilai Dasar Pekerjaan (Exclude Tax)</h4>
                            <div className="text-3xl font-bold gold-text tracking-tight">
                                {formatCurrency(project.po_value)}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Sidebar Specs */}
                <div className="space-y-6">
                    <Card className="glass-card">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <FileText className="w-5 h-5 text-gold-500" />
                                Termin Pembayaran
                            </CardTitle>
                            <CardDescription>
                                Skema penagihan disetujui
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {project.payment_terms && project.payment_terms.length > 0 ? (
                                    project.payment_terms.map((term, idx) => {
                                        const nominal = (project.po_value * term.percentage) / 100;
                                        return (
                                            <div key={idx} className="flex flex-col gap-1 p-3 rounded-lg border border-border/50 bg-muted/20">
                                                <div className="flex justify-between items-center w-full">
                                                    <span className="font-medium text-sm">{term.name}</span>
                                                    <Badge variant="secondary" className="bg-gold-500/10 text-gold-700 hover:bg-gold-500/20 border-0">
                                                        {term.percentage}%
                                                    </Badge>
                                                </div>
                                                <div className="text-right font-semibold text-sm mt-1">
                                                    {formatCurrency(nominal)}
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="text-center p-4 border border-dashed rounded-lg text-sm text-muted-foreground">
                                        Tidak ada skema termin khusus.
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="glass-card bg-muted/10 border-dashed">
                        <CardContent className="p-6">
                            <div className="flex items-center gap-3 text-sm text-muted-foreground mb-2">
                                <Calendar className="w-4 h-4" />
                                Terakhir Diperbarui
                            </div>
                            <p className="font-medium text-foreground">
                                {formatDate(project.updated_at)}
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Attachment Viewer */}
            {project.attachment_path && (
                <Card className="glass-card mt-6">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <FileText className="w-5 h-5 text-gold-500" />
                            Dokumen Lampiran (Bukti PO)
                        </CardTitle>
                        <CardDescription>Pratinjau berkas yang diunggah secara langsung.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {project.attachment_path.toLowerCase().endsWith('.pdf') ? (
                            <iframe
                                src={`${API_URL}/${project.attachment_path.replace(/\\/g, '/')}`}
                                className="w-full h-[700px] border border-border/50 rounded-xl shadow-inner bg-white/50"
                                title="Pratinjau Dokumen PO"
                            />
                        ) : (
                            <div className="flex justify-center bg-muted/20 border border-border/50 rounded-xl overflow-hidden p-4">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={`${API_URL}/${project.attachment_path.replace(/\\/g, '/')}`}
                                    alt="Pratinjau Lampiran PO"
                                    className="max-w-full max-h-[800px] object-contain rounded-lg"
                                />
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
