"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Building2, UploadCloud, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8081";

export default function CreateProjectPage() {
    const router = useRouter();
    const { token } = useAuth();

    const [isSaving, setIsSaving] = useState(false);
    const [file, setFile] = useState<File | null>(null);

    // Form State
    const [formData, setFormData] = useState({
        id: "",
        type: "PROJECT",
        pic_po: "",
        po_in_no: "",
        company: "",
        client_address: "",
        subject: "",
        qty: "1",
        po_value: "",
    });

    const [paymentTerms, setPaymentTerms] = useState<{ name: string; percentage: string }[]>([
        { name: "DP", percentage: "30" },
        { name: "Pelunasan", percentage: "70" }
    ]);

    const [formattedPoValue, setFormattedPoValue] = useState("");

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name as keyof typeof formData]: value }));
    };

    const handleSelectChange = (name: keyof typeof formData, value: string) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handlePoValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        // Remove non-digit chars
        const rawValue = e.target.value.replace(/\D/g, "");
        if (!rawValue) {
            setFormData(prev => ({ ...prev, po_value: "0" }));
            setFormattedPoValue("");
            return;
        }

        // Format for display (Indonesian Rupiah style with dots)
        const formatted = new Intl.NumberFormat("id-ID").format(Number(rawValue));
        setFormattedPoValue(formatted);

        // Store actual raw value for submission
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
        if (!formData.id) return "Project Code NO wajib diisi";
        if (!formData.company) return "Nama Company (Klien) wajib diisi";
        if (!formData.po_value || Number(formData.po_value) <= 0) return "Nilai PO wajib diisi dan valid";

        // Cek total persentase
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

            // Append all text fields
            Object.entries(formData).forEach(([key, value]) => {
                formDataObj.append(key, String(value));
            });

            // Append Payment Terms as JSON string
            formDataObj.append("payment_terms", JSON.stringify(
                paymentTerms.map(t => ({
                    name: t.name,
                    percentage: Number(t.percentage)
                }))
            ));

            // Append file if exists
            if (file) {
                formDataObj.append("attachment", file);
            }

            const res = await fetch(`${API_URL}/api/projects`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`
                    // Do NOT set Content-Type here, let the browser set it with boundary for FormData
                },
                body: formDataObj
            });

            const data = await res.json();

            if (data.success) {
                toast.success("Data Purchase Order berhasil disimpan!");
                router.push("/projects");
            } else {
                toast.error(data.message || "Gagal menyimpan data");
            }
        } catch (err) {
            console.error("Save error:", err);
            toast.error("Terjadi kesalahan sistem saat menyimpan data");
        } finally {
            setIsSaving(false);
        }
    };

    // Helper for visual feedback
    const currentTotalPercent = paymentTerms.reduce((sum, term) => sum + Number(term.percentage || 0), 0);

    return (
        <div className="space-y-6 max-w-4xl mx-auto pb-12">
            <div className="flex items-center gap-4">
                <Link href="/projects">
                    <Button variant="ghost" size="icon" className="rounded-lg">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Tambah Master PO</h1>
                    <p className="text-sm text-muted-foreground">
                        Registrasi Purchase Order baru untuk menerbitkan Invoice nantinya
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <Card className="glass-card">
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-gold-500" />
                            Informasi Utama Purchase Order
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Project Code NO <span className="text-red-500">*</span></Label>
                                <Input
                                    name="id"
                                    placeholder="Contoh: KSM-26P001"
                                    value={formData.id}
                                    onChange={handleChange}
                                    required
                                    className="bg-white/50 dark:bg-white/5"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Tipe (Keterangan)</Label>
                                <Select
                                    value={formData.type}
                                    onValueChange={(v) => handleSelectChange("type", v)}
                                >
                                    <SelectTrigger className="bg-white/50 dark:bg-white/5">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="PROJECT">PROJECT</SelectItem>
                                        <SelectItem value="RETAIL">RETAIL</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>PIC PO</Label>
                                <Input
                                    name="pic_po"
                                    placeholder="Nama PIC"
                                    value={formData.pic_po}
                                    onChange={handleChange}
                                    className="bg-white/50 dark:bg-white/5"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>PO In No.</Label>
                                <Input
                                    name="po_in_no"
                                    placeholder="Nomor referensi PO Klien"
                                    value={formData.po_in_no}
                                    onChange={handleChange}
                                    className="bg-white/50 dark:bg-white/5"
                                />
                            </div>

                            <div className="space-y-2 md:col-span-2">
                                <Label>Company (Klien) <span className="text-red-500">*</span></Label>
                                <Input
                                    name="company"
                                    placeholder="Contoh: PT Beringin Real Propertindo"
                                    value={formData.company}
                                    onChange={handleChange}
                                    required
                                    className="bg-white/50 dark:bg-white/5"
                                />
                            </div>

                            <div className="space-y-2 md:col-span-2">
                                <Label>Alamat Klien</Label>
                                <Textarea
                                    name="client_address"
                                    placeholder="Jl. Rambutan I No.12, RT.007/RW.011, Penggilingan, Kec. Cakung, Kota Jakarta Timur..."
                                    value={formData.client_address}
                                    onChange={handleChange}
                                    className="bg-white/50 dark:bg-white/5"
                                    rows={2}
                                />
                            </div>

                            <div className="space-y-2 md:col-span-2">
                                <Label>Subject (Deskripsi Pekerjaan)</Label>
                                <Textarea
                                    name="subject"
                                    placeholder="Deskripsi..."
                                    value={formData.subject}
                                    onChange={handleChange}
                                    className="bg-white/50 dark:bg-white/5"
                                    rows={2}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>QTY</Label>
                                <Input
                                    name="qty"
                                    type="number"
                                    min="1"
                                    value={formData.qty}
                                    onChange={handleChange}
                                    className="bg-white/50 dark:bg-white/5"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>PO Value (Nilai Dasar Exclude PPN) <span className="text-red-500">*</span></Label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium text-sm">Rp</span>
                                    <Input
                                        type="text"
                                        placeholder="Contoh: 4.000.000"
                                        value={formattedPoValue}
                                        onChange={handlePoValueChange}
                                        required
                                        className="bg-white/50 dark:bg-white/5 border-gold-400/30 pl-9"
                                    />
                                </div>
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

                <Card className="glass-card">
                    <CardHeader>
                        <CardTitle className="text-base">Lampiran Detail (Opsional)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="border-2 border-dashed border-border/60 rounded-xl p-8 flex flex-col items-center justify-center text-center bg-muted/20">
                            <UploadCloud className="h-10 w-10 text-muted-foreground mb-4" />
                            <Label htmlFor="file-upload" className="mb-2 cursor-pointer font-medium text-gold-500 hover:text-gold-600 transition-colors">
                                Pilih File PDF / Excel PO Client
                            </Label>
                            <Input
                                id="file-upload"
                                type="file"
                                className="hidden"
                                onChange={handleFileChange}
                                accept=".pdf,.xlsx,.xls,.doc,.docx"
                            />
                            {file ? (
                                <span className="text-sm font-medium bg-gold-400/10 text-gold-600 px-3 py-1 rounded-md">
                                    {file.name}
                                </span>
                            ) : (
                                <span className="text-xs text-muted-foreground max-w-xs">
                                    Lampirkan dokumen BAST, BAPP, atau dokumen resmi PO dari klien untuk referensi.
                                </span>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <div className="flex justify-end pt-4">
                    <Button
                        type="submit"
                        size="lg"
                        className="w-full sm:w-auto gold-gradient text-white shadow-lg shadow-gold-400/25"
                        disabled={isSaving}
                    >
                        {isSaving ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Menyimpan Data...
                            </>
                        ) : (
                            "Simpan Master PO"
                        )}
                    </Button>
                </div>
            </form>
        </div>
    );
}
