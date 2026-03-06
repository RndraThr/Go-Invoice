"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import {
    Paperclip,
    UploadCloud,
    X,
    Trash2,
    FileIcon,
    Loader2,
    FileText,
    Image as ImageIcon
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Attachment {
    id: number;
    invoice_id: number;
    file_name: string;
    file_path: string;
    file_type: string;
    created_at: string;
}

interface InvoiceAttachmentsProps {
    invoiceId: number;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8081";

export function InvoiceAttachments({ invoiceId }: InvoiceAttachmentsProps) {
    const { token } = useAuth();
    const [attachments, setAttachments] = useState<Attachment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [deletingId, setDeletingId] = useState<number | null>(null);

    const fetchAttachments = useCallback(async () => {
        try {
            const res = await fetch(`${API_URL}/api/invoices/${invoiceId}/attachments`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setAttachments(data.data || []);
            }
        } catch (err) {
            console.error("Failed to fetch attachments", err);
        } finally {
            setIsLoading(false);
        }
    }, [invoiceId, token]);

    useEffect(() => {
        if (token && invoiceId) {
            fetchAttachments();
        }
    }, [token, invoiceId, fetchAttachments]);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Basic validation
        if (file.size > 10 * 1024 * 1024) { // 10MB limit
            toast.error("Ukuran file maksimal 10MB");
            return;
        }

        setIsUploading(true);
        const formData = new FormData();
        formData.append("file", file);

        try {
            const res = await fetch(`${API_URL}/api/invoices/${invoiceId}/attachments`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`
                },
                body: formData,
            });

            const data = await res.json();
            if (data.success) {
                toast.success("File berhasil diunggah");
                fetchAttachments(); // Refresh list
            } else {
                toast.error(data.message || "Gagal mengunggah file");
            }
        } catch (err) {
            toast.error("Terjadi kesalahan jaringan saat mengunggah");
        } finally {
            setIsUploading(false);
            // Reset input
            if (e.target) e.target.value = '';
        }
    };

    const handleDelete = async (attachmentId: number) => {
        if (!confirm("Hapus lampiran ini?")) return;

        setDeletingId(attachmentId);
        try {
            const res = await fetch(`${API_URL}/api/invoices/${invoiceId}/attachments/${attachmentId}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` }
            });

            const data = await res.json();
            if (data.success) {
                toast.success("Lampiran dihapus");
                setAttachments(prev => prev.filter(a => a.id !== attachmentId));
            } else {
                toast.error(data.message || "Gagal menghapus lampiran");
            }
        } catch (err) {
            toast.error("Terjadi kesalahan jaringan");
        } finally {
            setDeletingId(null);
        }
    };

    const getFileIcon = (type: string) => {
        const t = type.toLowerCase();
        if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(t)) {
            return <ImageIcon className="h-5 w-5 text-blue-500" />;
        }
        if (['pdf'].includes(t)) {
            return <FileText className="h-5 w-5 text-red-500" />;
        }
        return <FileIcon className="h-5 w-5 text-slate-500" />;
    };

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    return (
        <Card className="shadow-sm border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-transparent">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Paperclip className="h-5 w-5 text-slate-500" />
                    Lampiran Pendukung
                </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
                {/* Upload Area */}
                <div className="relative border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg p-6 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex flex-col items-center justify-center text-center group">
                    <input
                        type="file"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        onChange={handleFileUpload}
                        disabled={isUploading}
                        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                    />
                    <div className="p-3 bg-gold-400/10 rounded-full mb-3 group-hover:scale-110 transition-transform">
                        {isUploading ? (
                            <Loader2 className="h-6 w-6 text-gold-500 animate-spin" />
                        ) : (
                            <UploadCloud className="h-6 w-6 text-gold-500" />
                        )}
                    </div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Klik atau Tarik file ke sini
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                        PDF, Word, Excel, JPG, PNG (Maks 10MB)
                    </p>
                </div>

                {/* File List */}
                {isLoading ? (
                    <div className="flex justify-center p-4">
                        <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                    </div>
                ) : attachments.length === 0 ? (
                    <div className="text-center py-6 text-sm text-slate-500 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                        Belum ada lampiran.
                    </div>
                ) : (
                    <div className="space-y-2">
                        {attachments.map((file) => (
                            <div
                                key={file.id}
                                className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg group hover:border-gold-400/30 transition-colors"
                            >
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-md shrink-0">
                                        {getFileIcon(file.file_type)}
                                    </div>
                                    <div className="truncate">
                                        <a
                                            href={`${API_URL}/uploads/invoices/${file.file_path.split(/[\/\\]/).pop()}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-sm font-medium hover:text-gold-500 hover:underline truncate block"
                                        >
                                            {file.file_name}
                                        </a>
                                        <div className="text-xs text-slate-500 mt-0.5">
                                            {new Date(file.created_at).toLocaleDateString('id-ID', {
                                                day: 'numeric', month: 'short', year: 'numeric',
                                                hour: '2-digit', minute: '2-digit'
                                            })}
                                        </div>
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-slate-400 hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={() => handleDelete(file.id)}
                                    disabled={deletingId === file.id}
                                >
                                    {deletingId === file.id ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Trash2 className="h-4 w-4" />
                                    )}
                                </Button>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
