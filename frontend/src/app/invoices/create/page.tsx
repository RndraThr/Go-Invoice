"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
    ArrowLeft,
    Plus,
    Trash2,
    Calculator,
    Loader2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import { toast } from "sonner";

interface InvoiceItem {
    item_code: string;
    description: string;
    quantity: number;
    unit: string;
    unit_price: number;
    total_price: number;
}

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
    client_address: string;
    subject: string;
    qty: number;
    po_value: number;
    payment_terms: PaymentTerm[];
    attachment_path: string;
}

function formatCurrency(amount: number): string {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8081";

export default function CreateInvoicePage() {
    const router = useRouter();
    const { token } = useAuth();

    const [projects, setProjects] = useState<Project[]>([]);
    const [isLoadingProjects, setIsLoadingProjects] = useState(true);

    const [selectedProjectObj, setSelectedProjectObj] = useState<Project | null>(null);
    const [clientName, setClientName] = useState("");
    const [clientAddress, setClientAddress] = useState("");
    const [projectName, setProjectName] = useState("");

    const [invoiceNumber, setInvoiceNumber] = useState("");
    const [invoiceDate, setInvoiceDate] = useState("");
    const [dueDate, setDueDate] = useState("");
    const [taxRate, setTaxRate] = useState(11);
    const [discount, setDiscount] = useState(0);
    const [notes, setNotes] = useState("KAMI TIDAK MENERIMA PEMBEBANAN BIAYA BANK,\nHARAP PASTIKAN PEMBAYARAN SESUAI DENGAN\nNOMINAL INVOICE.\nPEMBAYARAN DITRANSFER KE REKENING\nBSI CABANG KCP BEKASI JATIASIH\nA/N : KIAN SANTANG MULIATAMA PT\nRek. No. 7185595751 ( IDR )");
    const [terminNumber, setTerminNumber] = useState<number | null>(null);
    const [termOptions, setTermOptions] = useState<{ id: number; label: string; percentage: number }[]>([]);

    const [items, setItems] = useState<InvoiceItem[]>([
        { item_code: "", description: "", quantity: 1, unit: "Ls", unit_price: 0, total_price: 0 },
    ]);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const fetchProjects = async () => {
            if (!token) return;
            try {
                const res = await fetch(`${API_URL}/api/projects`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const data = await res.json();
                if (data.success && data.data) {
                    setProjects(data.data);
                }
            } catch (err) {
                console.error("Failed to fetch projects", err);
            } finally {
                setIsLoadingProjects(false);
            }
        };
        fetchProjects();
    }, [token]);

    const handleProjectChange = (projectId: string) => {
        const project = projects.find((p) => p.id === projectId);
        if (project) {
            setSelectedProjectObj(project);
            setClientName(project.company);
            setClientAddress(project.client_address || "");
            setProjectName(project.subject);
            setTerminNumber(null);

            // Generate Term Options based on project dynamic terms
            const options: { id: number; label: string; percentage: number }[] = [];

            if (project.payment_terms && Array.isArray(project.payment_terms)) {
                project.payment_terms.forEach((term, index) => {
                    if (term.percentage > 0) {
                        options.push({
                            id: index,
                            label: `${term.name} (${term.percentage}%)`,
                            percentage: term.percentage
                        });
                    }
                });
            }

            setTermOptions(options);

            // Reset items
            setItems([
                { item_code: "", description: "", quantity: 1, unit: "Ls", unit_price: 0, total_price: 0 },
            ]);
        }
    };

    const handleTermChange = (termIdStr: string) => {
        const termId = Number(termIdStr);
        setTerminNumber(termId);

        if (selectedProjectObj) {
            const option = termOptions.find(opt => opt.id === termId);
            if (option) {
                const calculatedValue = (selectedProjectObj.po_value * option.percentage) / 100;

                // Auto populate the first item
                const newItem: InvoiceItem = {
                    item_code: "TRM",
                    description: `Tagihan ${option.label} - Pekerjaan: ${selectedProjectObj.subject}`,
                    quantity: 1,
                    unit: "Ls",
                    unit_price: calculatedValue,
                    total_price: calculatedValue
                };
                setItems([newItem]);
            }
        }
    };

    const addItem = () => {
        setItems([
            ...items,
            { item_code: "", description: "", quantity: 1, unit: "Ls", unit_price: 0, total_price: 0 },
        ]);
    };

    const removeItem = (index: number) => {
        if (items.length > 1) {
            setItems(items.filter((_, i) => i !== index));
        }
    };

    const updateItem = (index: number, field: keyof InvoiceItem, value: string | number) => {
        const newItems = [...items];
        (newItems[index] as any)[field] = value;
        // Recalculate total
        newItems[index].total_price = newItems[index].quantity * newItems[index].unit_price;
        setItems(newItems);
    };

    const subtotal = items.reduce((sum, item) => sum + item.total_price, 0);
    const taxAmount = (subtotal - discount) * (taxRate / 100);
    const grandTotal = subtotal - discount + taxAmount;

    const parseDateToYYYYMMDD = (dateStr: string) => {
        if (!dateStr) return "";
        return dateStr;
    }

    const validateForm = () => {
        if (!selectedProjectObj) return "Pilih proyek terlebih dahulu";
        if (!invoiceNumber) return "Nomor Invoice wajib diisi";
        if (terminNumber === null) return "Silakan pilih Termin / Pembayaran ke berapa";
        if (!invoiceDate) return "Tanggal invoice wajib diisi";
        if (!dueDate) return "Jatuh tempo wajib diisi";
        if (items.some(i => !i.description || i.quantity <= 0 || i.unit_price <= 0)) {
            return "Periksa kembali detail item (deskripsi, qty, harga tidak boleh kosong/nol)";
        }
        return null;
    };

    const handleSave = async (submitForReview = false) => {
        const error = validateForm();
        if (error) {
            toast.error(error);
            return;
        }

        setIsSaving(true);
        try {
            const payload = {
                project_id: selectedProjectObj?.id,
                project_name: projectName,
                client_name: clientName,
                client_address: clientAddress,
                invoice_number: invoiceNumber,
                invoice_date: parseDateToYYYYMMDD(invoiceDate),
                due_date: parseDateToYYYYMMDD(dueDate),
                tax_rate: taxRate,
                discount: discount,
                notes: notes,
                termin_number: terminNumber,
                items: items.map(i => ({
                    item_code: i.item_code || "GENERIC",
                    description: i.description,
                    quantity: i.quantity,
                    unit: i.unit,
                    unit_price: i.unit_price
                }))
            };

            // 1. Create Invoice
            const res = await fetch(`${API_URL}/api/invoices`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });
            const data = await res.json();

            if (!data.success) {
                toast.error(data.message || "Gagal menyimpan draft");
                return;
            }

            // 2. Opt: Submit for Review
            if (submitForReview && data.data?.id) {
                const submitRes = await fetch(`${API_URL}/api/invoices/${data.data.id}/submit`, {
                    method: "POST",
                    headers: { Authorization: `Bearer ${token}` }
                });
                const submitData = await submitRes.json();
                if (!submitData.success) {
                    toast.warning("Draft tersimpan, tapi gagal diajukan untuk review");
                } else {
                    toast.success("Invoice berhasil diajukan untuk direview!");
                }
            } else {
                toast.success("Draft invoice berhasil disimpan!");
            }

            // Redirect back to list
            router.push("/invoices");

        } catch (err) {
            console.error("Save invoice error:", err);
            toast.error("Terjadi kesalahan sistem");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-6 max-w-5xl mx-auto pb-12">
            {/* Page Header */}
            <div className="flex items-center gap-4">
                <Link href="/invoices">
                    <Button variant="ghost" size="icon" className="rounded-lg">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Invoice Baru</h1>
                    <p className="text-sm text-muted-foreground">
                        Pembuatan Invoice cerdas, didasarkan pada form Master Project PO
                    </p>
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                {/* Main Form */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Project & Client */}
                    <Card className="glass-card">
                        <CardHeader>
                            <CardTitle className="text-base">Informasi Proyek & Termin</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>Pilih Proyek / PO Base</Label>
                                <Select
                                    value={selectedProjectObj?.id || ""}
                                    onValueChange={handleProjectChange}
                                >
                                    <SelectTrigger className="bg-white/50 dark:bg-white/5">
                                        <SelectValue placeholder={isLoadingProjects ? "Memuat proyek..." : "Pilih proyek dari database..."} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {projects.map((p) => (
                                            <SelectItem key={p.id} value={p.id}>
                                                {p.id} — {p.company}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {selectedProjectObj && (
                                <div className="p-3 bg-muted/50 rounded-lg text-sm space-y-3 mb-4 border border-border/50">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Klien:</span>
                                        <span className="font-medium">{clientName}</span>
                                    </div>
                                    {clientAddress && (
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Alamat:</span>
                                            <span className="font-medium text-right max-w-xs whitespace-pre-line">{clientAddress}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Pekerjaan:</span>
                                        <span className="font-medium text-right max-w-xs truncate">{selectedProjectObj.subject}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Total Nilai PO:</span>
                                        <span className="font-medium gold-text">{formatCurrency(selectedProjectObj.po_value)} <span className="text-[10px] text-muted-foreground">(Exc. Tax)</span></span>
                                    </div>
                                </div>
                            )}

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label>Nomor Invoice <span className="text-red-500">*</span></Label>
                                    <Input
                                        placeholder="Contoh: 001/INV-KSM/II/2026"
                                        value={invoiceNumber}
                                        onChange={(e) => setInvoiceNumber(e.target.value)}
                                        className="bg-white/50 dark:bg-white/5"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Termin Ke</Label>
                                    <Select
                                        value={terminNumber !== null ? String(terminNumber) : ""}
                                        onValueChange={handleTermChange}
                                        disabled={!selectedProjectObj || termOptions.length === 0}
                                    >
                                        <SelectTrigger className="bg-white/50 dark:bg-white/5">
                                            <SelectValue placeholder="Pilih persentase termin..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {termOptions.map((opt) => (
                                                <SelectItem key={opt.id} value={String(opt.id)}>
                                                    {opt.label}
                                                </SelectItem>
                                            ))}
                                            {termOptions.length === 0 && selectedProjectObj && (
                                                <SelectItem value="none" disabled>
                                                    Tidak ada persentase Termin {">"} 0 di proyek ini
                                                </SelectItem>
                                            )}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Tanggal Invoice</Label>
                                    <Input
                                        type="date"
                                        className="bg-white/50 dark:bg-white/5"
                                        value={invoiceDate}
                                        onChange={(e) => setInvoiceDate(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Jatuh Tempo</Label>
                                    <Input
                                        type="date"
                                        className="bg-white/50 dark:bg-white/5"
                                        value={dueDate}
                                        onChange={(e) => setDueDate(e.target.value)}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Invoice Items */}
                    <Card className="glass-card">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="text-base">Detail Item (Otomatis dari PO Terpilih)</CardTitle>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={addItem}
                                className="border-gold-400/30 text-gold-500 hover:bg-gold-400/10"
                            >
                                <Plus className="mr-1 h-4 w-4" />
                                Baris Baru
                            </Button>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {items.map((item, index) => (
                                <div
                                    key={index}
                                    className="rounded-lg border border-border/50 p-4 space-y-3"
                                >
                                    <div className="flex items-start justify-between">
                                        <span className="text-xs font-medium text-muted-foreground">
                                            Item #{index + 1}
                                        </span>
                                        {items.length > 1 && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7 text-destructive hover:text-destructive"
                                                onClick={() => removeItem(index)}
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs">Deskripsi Pekerjaan / Penyerahan</Label>
                                        <Input
                                            placeholder="Deskripsi layanan atau material..."
                                            className="bg-white/50 dark:bg-white/5"
                                            value={item.description}
                                            onChange={(e) =>
                                                updateItem(index, "description", e.target.value)
                                            }
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                        <div className="space-y-2">
                                            <Label className="text-xs">Qty</Label>
                                            <Input
                                                type="number"
                                                min={0}
                                                className="bg-white/50 dark:bg-white/5"
                                                value={item.quantity || ""}
                                                onChange={(e) =>
                                                    updateItem(index, "quantity", Number(e.target.value))
                                                }
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs">Satuan</Label>
                                            <Select
                                                value={item.unit}
                                                onValueChange={(v) => updateItem(index, "unit", v)}
                                            >
                                                <SelectTrigger className="bg-white/50 dark:bg-white/5">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Ls">Ls</SelectItem>
                                                    <SelectItem value="Set">Set</SelectItem>
                                                    <SelectItem value="Pcs">Pcs</SelectItem>
                                                    <SelectItem value="Meter">Meter</SelectItem>
                                                    <SelectItem value="Kg">Kg</SelectItem>
                                                    <SelectItem value="Unit">Unit</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs">Harga Satuan</Label>
                                            <Input
                                                type="number"
                                                min={0}
                                                className="bg-white/50 dark:bg-white/5"
                                                value={item.unit_price || ""}
                                                onChange={(e) =>
                                                    updateItem(index, "unit_price", Number(e.target.value))
                                                }
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs">Total Harga</Label>
                                            <Input
                                                value={formatCurrency(item.total_price)}
                                                readOnly
                                                className="bg-muted/50 font-medium"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    {/* Notes */}
                    <Card className="glass-card">
                        <CardHeader>
                            <CardTitle className="text-base">Catatan</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Textarea
                                placeholder="Mandatory notes, terms, bank details dll..."
                                rows={3}
                                className="bg-white/50 dark:bg-white/5"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                            />
                        </CardContent>
                    </Card>
                </div>

                {/* Summary Sidebar */}
                <div className="space-y-6">
                    <Card className="glass-card sticky top-24">
                        <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                                <Calculator className="h-4 w-4 text-gold-400" />
                                Ringkasan Biaya
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Subtotal</span>
                                    <span className="font-medium">{formatCurrency(subtotal)}</span>
                                </div>
                                <div className="flex justify-between text-sm items-center gap-2">
                                    <span className="text-muted-foreground">Diskon</span>
                                    <Input
                                        type="number"
                                        min={0}
                                        value={discount}
                                        onChange={(e) => setDiscount(Number(e.target.value))}
                                        className="w-32 text-right h-8 text-sm bg-white/50 dark:bg-white/5"
                                    />
                                </div>
                                <div className="flex justify-between text-sm items-center gap-2">
                                    <span className="text-muted-foreground">PPN</span>
                                    <div className="flex items-center gap-1">
                                        <Input
                                            type="number"
                                            min={0}
                                            max={100}
                                            value={taxRate}
                                            onChange={(e) => setTaxRate(Number(e.target.value))}
                                            className="w-16 text-right h-8 text-sm bg-white/50 dark:bg-white/5"
                                        />
                                        <span className="text-xs text-muted-foreground">%</span>
                                    </div>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Total Pajak</span>
                                    <span>{formatCurrency(taxAmount)}</span>
                                </div>
                                <Separator />
                                <div className="flex justify-between">
                                    <span className="font-semibold">Grand Total</span>
                                    <span className="text-lg font-bold gold-text">
                                        {formatCurrency(grandTotal)}
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-2 pt-2">
                                <Button
                                    className="w-full gold-gradient text-white shadow-lg shadow-gold-400/25"
                                    onClick={() => handleSave(false)}
                                    disabled={isSaving}
                                >
                                    {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                                    Simpan sebagai Draft
                                </Button>
                                <Button
                                    variant="outline"
                                    className="w-full"
                                    onClick={() => handleSave(true)}
                                    disabled={isSaving}
                                >
                                    {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                                    Simpan & Ajukan (Review)
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
