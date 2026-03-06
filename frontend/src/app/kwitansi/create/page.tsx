"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
    ArrowLeft,
    Save,
    CalendarIcon,
    Loader2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface Invoice {
    id: number;
    invoice_number: string;
    project_id: string;
    project_name: string;
    client_name: string;
    client_address: string;
    grand_total: number;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8081";

export default function CreateKwitansiPage() {
    const router = useRouter();
    const { token } = useAuth();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [invoices, setInvoices] = useState<Invoice[]>([]);

    // Form state
    const [invoiceId, setInvoiceId] = useState<number>(0);
    const [invoiceNumber, setInvoiceNumber] = useState("");
    const [projectId, setProjectId] = useState("");
    const [projectName, setProjectName] = useState("");
    const [clientName, setClientName] = useState("");
    const [clientAddress, setClientAddress] = useState("");
    const [kwitansiNumber, setKwitansiNumber] = useState("");
    const [kwitansiDate, setKwitansiDate] = useState(
        new Date().toISOString().split("T")[0]
    );
    const [amount, setAmount] = useState<number>(0);
    const [purpose, setPurpose] = useState("");
    const [notes, setNotes] = useState("");

    useEffect(() => {
        if (!token) return;
        const fetchInvoices = async () => {
            try {
                // Fetch all invoices, we will filter for approved/sent/paid on frontend for simplicity
                const res = await fetch(`${API_URL}/api/invoices`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const data = await res.json();
                if (data.success) {
                    const validInvoices = (data.data || []).filter((inv: any) =>
                        ["approved", "sent", "paid"].includes(inv.status)
                    );
                    setInvoices(validInvoices);
                }
            } catch (error) {
                console.error("Failed to load invoices", error);
            }
        };
        fetchInvoices();
    }, [token]);

    const handleInvoiceChange = (val: string) => {
        const selectedId = Number(val);
        setInvoiceId(selectedId);

        const inv = invoices.find((x) => x.id === selectedId);
        if (inv) {
            setInvoiceNumber(inv.invoice_number);
            setProjectId(inv.project_id);
            setProjectName(inv.project_name);
            setClientName(inv.client_name);
            setClientAddress(inv.client_address || "");
            setAmount(inv.grand_total || 0);
            setPurpose(`Pelunasan Tagihan Invoice No: ${inv.invoice_number}`);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!invoiceId || !clientName || !kwitansiNumber || amount <= 0) {
            toast.error("Harap isi Invoice, Nomor Kwitansi, dan Nominal yang valid");
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await fetch(`${API_URL}/api/kwitansi`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    invoice_id: invoiceId,
                    invoice_number: invoiceNumber,
                    project_id: projectId,
                    project_name: projectName,
                    client_name: clientName,
                    client_address: clientAddress,
                    kwitansi_number: kwitansiNumber, // Let backend auto-generate if empty
                    kwitansi_date: kwitansiDate,
                    amount: amount,
                    purpose: purpose,
                    notes: notes,
                }),
            });

            const data = await res.json();
            if (data.success) {
                toast.success("Kwitansi Draft berhasil dibuat!");
                router.push(`/kwitansi/${data.data.id}`);
            } else {
                toast.error(data.message || "Gagal membuat kwitansi");
            }
        } catch (error) {
            toast.error("Tidak dapat terhubung ke server");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6 max-w-5xl">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => router.push("/kwitansi")}
                        className="h-8 w-8 hover:bg-gold-500/10 hover:text-gold-500"
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Buat Kwitansi</h1>
                        <p className="text-sm text-muted-foreground">
                            Draft kwitansi baru secara independen
                        </p>
                    </div>
                </div>

                <div className="flex gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => router.push("/kwitansi")}
                        className="bg-white/50 dark:bg-slate-900/50"
                    >
                        Batal
                    </Button>
                    <Button
                        type="submit"
                        disabled={isSubmitting}
                        className="bg-gold-500 hover:bg-gold-600 text-white"
                    >
                        {isSubmitting ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Save className="mr-2 h-4 w-4" />
                        )}
                        Simpan Draft
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Informasi Klien & Proyek */}
                <Card className="glass-card shadow-sm">
                    <CardContent className="p-6 space-y-4">
                        <h3 className="text-lg font-semibold flex items-center gap-2 pb-2 border-b border-border/50 text-slate-800 dark:text-slate-200">
                            Informasi Proyek & Klien
                        </h3>

                        <div className="space-y-2">
                            <Label>Referensi Tagihan (Invoice) <span className="text-red-500">*</span></Label>
                            <Select value={invoiceId ? invoiceId.toString() : ""} onValueChange={handleInvoiceChange}>
                                <SelectTrigger className="bg-white/50 dark:bg-white/5 focus:ring-gold-500/30">
                                    <SelectValue placeholder="-- Pilih Invoice Tagihan --" />
                                </SelectTrigger>
                                <SelectContent>
                                    {invoices.map((inv) => (
                                        <SelectItem key={inv.id} value={inv.id.toString()}>
                                            {inv.invoice_number} - {inv.client_name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {projectId && (
                                <p className="text-xs text-muted-foreground mt-1 px-1">
                                    Project: {projectId} {projectName ? `(${projectName})` : ""}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2 pt-2">
                            <Label htmlFor="clientName">Nama Klien / Perusahaan <span className="text-red-500">*</span></Label>
                            <Input
                                id="clientName"
                                value={clientName}
                                onChange={(e) => setClientName(e.target.value)}
                                className="bg-white/50 dark:bg-white/5 focus:ring-gold-500/30"
                                required
                            />
                        </div>

                        <div className="space-y-2 pt-2">
                            <Label htmlFor="clientAddress">Alamat Penagihan (Opsional)</Label>
                            <Textarea
                                id="clientAddress"
                                value={clientAddress}
                                onChange={(e) => setClientAddress(e.target.value)}
                                rows={3}
                                className="bg-white/50 dark:bg-white/5 focus:ring-gold-500/30 resize-none"
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Detail Kwitansi */}
                <Card className="glass-card shadow-sm">
                    <CardContent className="p-6 space-y-4">
                        <h3 className="text-lg font-semibold flex items-center gap-2 pb-2 border-b border-border/50 text-slate-800 dark:text-slate-200">
                            Detail Kwitansi
                        </h3>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="kwitansiNumber">No. Kwitansi <span className="text-red-500">*</span></Label>
                                <Input
                                    id="kwitansiNumber"
                                    value={kwitansiNumber}
                                    onChange={(e) => setKwitansiNumber(e.target.value)}
                                    placeholder="Contoh: 001/KWI-KSM/II/2026"
                                    className="bg-white/50 dark:bg-white/5 focus:ring-gold-500/30"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="kwitansiDate">Tanggal Kwitansi <span className="text-red-500">*</span></Label>
                                <div className="relative">
                                    <Input
                                        id="kwitansiDate"
                                        type="date"
                                        value={kwitansiDate}
                                        onChange={(e) => setKwitansiDate(e.target.value)}
                                        className="bg-white/50 dark:bg-white/5 focus:ring-gold-500/30 pl-10"
                                        required
                                    />
                                    <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2 pt-2">
                            <Label htmlFor="amount">Nominal Rp <span className="text-red-500">*</span></Label>
                            <Input
                                id="amount"
                                type="number"
                                min="0"
                                value={amount || ""}
                                onChange={(e) => setAmount(Number(e.target.value))}
                                className="text-right text-lg font-mono bg-white/50 dark:bg-white/5 focus:ring-gold-500/30"
                                required
                            />
                        </div>

                        <div className="space-y-2 pt-2">
                            <Label htmlFor="purpose">Untuk Pembayaran <span className="text-red-500">*</span></Label>
                            <Textarea
                                id="purpose"
                                value={purpose}
                                onChange={(e) => setPurpose(e.target.value)}
                                rows={2}
                                placeholder="Contoh: Pembayaran DP 30% untuk pekerjaan instalasi pipa..."
                                className="bg-white/50 dark:bg-white/5 focus:ring-gold-500/30 resize-none font-medium"
                                required
                            />
                        </div>

                        <div className="space-y-2 pt-2">
                            <Label htmlFor="notes">Catatan Tambahan (Opsional)</Label>
                            <Textarea
                                id="notes"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                rows={2}
                                className="bg-white/50 dark:bg-white/5 focus:ring-gold-500/30 resize-none"
                            />
                        </div>
                    </CardContent>
                </Card>
            </div>
        </form>
    );
}
