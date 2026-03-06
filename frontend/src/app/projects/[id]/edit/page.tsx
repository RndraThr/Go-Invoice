"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Plus, ArrowLeft, Loader2, Save } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8081";

interface PaymentTerm {
    name: string;
    percentage: number;
}

export default function EditProjectPage() {
    const { token } = useAuth();
    const router = useRouter();
    const params = useParams();
    const projectId = params.id as string;

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [file, setFile] = useState<File | null>(null);

    const [formData, setFormData] = useState({
        type: "PROJECT",
        pic_po: "",
        po_in_no: "",
        company: "",
        client_address: "",
        subject: "",
        qty: "1",
        po_value: "",
    });

    const [paymentTerms, setPaymentTerms] = useState<{ name: string; percentage: string }[]>([]);
    const [formattedPoValue, setFormattedPoValue] = useState("");

    useEffect(() => {
        const fetchProject = async () => {
            if (!token) return;
            try {
                const res = await fetch(`${API_URL}/api/projects/${projectId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const data = await res.json();

                if (data.success && data.data) {
                    const p = data.data;
                    setFormData({
                        type: p.type,
                        pic_po: p.pic_po || "",
                        po_in_no: p.po_in_no || "",
                        company: p.company || "",
                        client_address: p.client_address || "",
                        subject: p.subject || "",
                        qty: String(p.qty),
                        po_value: String(p.po_value),
                    });

                    if (p.po_value) {
                        setFormattedPoValue(new Intl.NumberFormat("id-ID").format(Number(p.po_value)));
                    }

                    if (p.payment_terms && Array.isArray(p.payment_terms)) {
                        setPaymentTerms(p.payment_terms.map((t: PaymentTerm) => ({
                            name: t.name,
                            percentage: String(t.percentage)
                        })));
                    }
                } else {
                    toast.error(data.message || "Proyek tidak ditemukan");
                    router.push("/projects");
                }
            } catch (err) {
                toast.error("Terjadi kesalahan saat memuat data");
            } finally {
                setIsLoading(false);
            }
        };

        fetchProject();
    }, [projectId, token, router]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name as keyof typeof formData]: value }));
    };

    const handleSelectChange = (name: keyof typeof formData, value: string) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handlePoValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawValue = e.target.value.replace(/\D/g, "");
        if (!rawValue) {
            setFormData(prev => ({ ...prev, po_value: "0" }));
            setFormattedPoValue("");
            return;
        }

        const formatted = new Intl.NumberFormat("id-ID").format(Number(rawValue));
        setFormattedPoValue(formatted);
        setFormData(prev => ({ ...prev, po_value: rawValue }));
    };

    const addPaymentTerm = () => {
        setPaymentTerms(prev => [...prev, { name: `Termin ${prev.length}`, percentage: "0" }]);
    };

    const removePaymentTerm = (index: number) => {
        setPaymentTerms(prev => prev.filter((_, i) => i !== index));
    };

    const handleTermChange = (index: number, field: "name" | "percentage", value: string) => {
        setPaymentTerms(prev => {
            const newTerms = [...prev];

            if (field === "name") {
                newTerms[index].name = value;
            } else {
                let numVal = Number(value);
                if (numVal < 0) numVal = 0;
                if (numVal > 100) numVal = 100;

                const otherFieldsTotal = newTerms.reduce((acc, term, i) => {
                    return i === index ? acc : acc + Number(term.percentage);
                }, 0);

                if (otherFieldsTotal + numVal > 100) {
                    const remainder = 100 - otherFieldsTotal;
                    newTerms[index].percentage = String(remainder > 0 ? remainder : 0);
                } else {
                    newTerms[index].percentage = String(numVal);
                }
            }
            return newTerms;
        });
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setFile(e.target.files[0]);
        }
    };

    const validateForm = () => {
        if (!formData.company) return "Nama Company (Klien) wajib diisi";
        if (!formData.po_value || Number(formData.po_value) <= 0) return "Nilai PO wajib diisi dan valid";

        const total = paymentTerms.reduce((sum, term) => sum + Number(term.percentage || 0), 0);
        if (paymentTerms.length > 0 && total !== 100) {
            return `Total persentase termin harus 100% (saat ini ${total}%)`;
        }

        if (paymentTerms.some(t => !t.name.trim())) {
            return "Nama/Keterangan termin tidak boleh kosong";
        }
        return null;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const error = validateForm();
        if (error) {
            toast.error(error);
            return;
        }

        setIsSaving(true);
        try {
            const formDataObj = new FormData();

            Object.entries(formData).forEach(([key, value]) => {
                formDataObj.append(key, String(value));
            });

            formDataObj.append("payment_terms", JSON.stringify(
                paymentTerms.map(t => ({
                    name: t.name,
                    percentage: Number(t.percentage)
                }))
            ));

            if (file) {
                formDataObj.append("attachment", file);
            }

            const res = await fetch(`${API_URL}/api/projects/${projectId}`, {
                method: "PUT",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                body: formDataObj,
            });

            const data = await res.json();
            if (res.ok && data.success) {
                toast.success("PO / Proyek berhasil diperbarui");
                router.push(`/projects/${projectId}`);
            } else {
                toast.error(data.message || "Gagal memperbarui proyek");
            }
        } catch (err) {
            console.error(err);
            toast.error("Terjadi kesalahan sistem saat memperbarui laporan");
        } finally {
            setIsSaving(false);
        }
    };

    const currentTotalPercent = paymentTerms.reduce((sum, term) => sum + Number(term.percentage || 0), 0);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh]">
                <Loader2 className="h-8 w-8 animate-spin text-gold-500 mb-4" />
                <p className="text-muted-foreground">Memuat data proyek...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-4xl mx-auto pb-12">
            <div className="flex items-center gap-4">
                <Link href={`/projects/${projectId}`}>
                    <Button variant="ghost" size="icon" className="rounded-lg">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Edit PO {projectId}</h1>
                    <p className="text-sm text-muted-foreground">
                        Ubah data, nilai proyek, atau skema pembayaran termin.
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
                <Card className="glass-card">
                    <CardHeader>
                        <CardTitle className="text-lg">Informasi Utama</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Project Code NO (Disabled)</Label>
                                <Input disabled value={projectId} className="bg-muted" />
                            </div>

                            <div className="space-y-2">
                                <Label>Tipe Pekerjaan <span className="text-destructive">*</span></Label>
                                <Select value={formData.type} onValueChange={(val) => handleSelectChange("type", val)}>
                                    <SelectTrigger className="bg-white/50 dark:bg-white/5">
                                        <SelectValue placeholder="Pilih Tipe" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="PROJECT">Project / Borongan</SelectItem>
                                        <SelectItem value="RETAIL">Retail / Jual Putus</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Nama Company (Klien) <span className="text-destructive">*</span></Label>
                                <Input name="company" value={formData.company} onChange={handleChange} required placeholder="PT. ABC" className="bg-white/50 dark:bg-white/5" />
                            </div>

                            <div className="sm:col-span-2 space-y-2">
                                <Label>Alamat Klien</Label>
                                <Textarea name="client_address" value={formData.client_address} onChange={handleChange} placeholder="Jl. Sudirman No 1..." className="bg-white/50 dark:bg-white/5 min-h-[60px]" rows={2} />
                            </div>

                            <div className="space-y-2">
                                <Label>NO PO Masuk (Dari Klien)</Label>
                                <Input name="po_in_no" value={formData.po_in_no} onChange={handleChange} placeholder="PO-2026-001" className="bg-white/50 dark:bg-white/5" />
                            </div>

                            <div className="sm:col-span-2 space-y-2">
                                <Label>Subject / Deskripsi Pekerjaan</Label>
                                <Textarea name="subject" value={formData.subject} onChange={handleChange} placeholder="Pengadaan dan Pemasangan CCTV..." className="bg-white/50 dark:bg-white/5 min-h-[80px]" />
                            </div>

                            <div className="space-y-2">
                                <Label>Nilai Dasar Pekerjaan (PO Value) <span className="text-destructive">*</span></Label>
                                <div className="relative">
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none text-sm font-medium">Rp</div>
                                    <Input
                                        type="text"
                                        value={formattedPoValue}
                                        onChange={handlePoValueChange}
                                        required
                                        className="pl-9 bg-white/50 dark:bg-white/5 font-semibold"
                                        placeholder="0"
                                    />
                                </div>
                                <p className="text-xs text-muted-foreground">Otomatis diformat ribuan. Masukkan nilai mentah (Exclude PPN)</p>
                            </div>

                            <div className="space-y-2">
                                <Label>Kuantitas Total</Label>
                                <Input name="qty" type="number" min="1" value={formData.qty} onChange={handleChange} className="bg-white/50 dark:bg-white/5" />
                                <p className="text-xs text-muted-foreground">Biasanya 1 Ls / 1 Lot</p>
                            </div>

                            <div className="space-y-2">
                                <Label>PIC PO KSM</Label>
                                <Input name="pic_po" value={formData.pic_po} onChange={handleChange} placeholder="Nama Sales/Admin" className="bg-white/50 dark:bg-white/5" />
                            </div>

                            <div className="space-y-2">
                                <Label>Update Bukti PO (PDF/Image) - Opsional</Label>
                                <Input type="file" onChange={handleFileChange} accept=".pdf,image/*" className="bg-white/50 dark:bg-white/5 cursor-pointer" />
                                <p className="text-xs text-muted-foreground">Kosongkan jika tidak ingin mengubah file aslinya</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="glass-card">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-base flex items-center gap-2">
                            Skema Pembayaran (Termin %)
                            <Badge variant="outline" className={currentTotalPercent === 100 ? "text-emerald-500 border-emerald-500/30" : "text-amber-500 border-amber-500/30"}>
                                Total: {currentTotalPercent}%
                            </Badge>
                        </CardTitle>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={addPaymentTerm}
                            className="text-gold-500 border-gold-500/30 hover:bg-gold-500/10"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Tambah Termin
                        </Button>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-3 pt-2">
                            {paymentTerms.map((term, index) => (
                                <div key={index} className="flex items-center gap-3">
                                    <div className="flex-1 space-y-1">
                                        <Label className="text-xs text-muted-foreground">Keterangan Termin</Label>
                                        <Input
                                            value={term.name}
                                            onChange={(e) => handleTermChange(index, "name", e.target.value)}
                                            className="bg-white/50 dark:bg-white/5"
                                            placeholder="Contoh: DP, Termin 1..."
                                        />
                                    </div>
                                    <div className="w-24 space-y-1">
                                        <Label className="text-xs text-muted-foreground">Persentase (%)</Label>
                                        <Input
                                            type="number"
                                            value={term.percentage}
                                            onChange={(e) => handleTermChange(index, "percentage", e.target.value)}
                                            className="bg-white/50 dark:bg-white/5 text-center"
                                        />
                                    </div>
                                    <div className="pt-5">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                            onClick={() => removePaymentTerm(index)}
                                            disabled={paymentTerms.length === 1}
                                        >
                                            <span className="text-lg leading-none">&times;</span>
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        {paymentTerms.length === 0 && (
                            <p className="text-sm text-center text-muted-foreground py-4 border border-dashed rounded-lg">
                                Belum ada termin yang ditambahkan.
                            </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-4">
                            Total keseluruhan wajib mencapai 100% untuk validitas data penagihan.
                        </p>
                    </CardContent>
                </Card>

                <div className="flex justify-end gap-4 pb-12">
                    <Link href={`/projects/${projectId}`}>
                        <Button type="button" variant="ghost">Batal</Button>
                    </Link>
                    <Button type="submit" disabled={isSaving} className="gold-gradient text-white shadow-lg shadow-gold-400/20 min-w-[150px]">
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        {isSaving ? "Menyimpan..." : "Simpan Perubahan"}
                    </Button>
                </div>
            </form>
        </div>
    );
}
