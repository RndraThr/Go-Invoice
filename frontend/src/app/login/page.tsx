"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ThemeToggle } from "@/components/theme-toggle";
import {
    AlertTriangle,
    Loader2,
    Eye,
    EyeOff,
    Flame,
    Shield,
    FileText,
    TrendingUp,
} from "lucide-react";

export default function LoginPage() {
    const { login } = useAuth();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [rememberMe, setRememberMe] = useState(false);
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const emailRef = useRef<HTMLInputElement>(null);

    // #2 Auto-focus email input
    useEffect(() => {
        emailRef.current?.focus();
    }, []);

    // Load remembered email
    useEffect(() => {
        const remembered = localStorage.getItem("remember_me");
        if (remembered === "true") {
            setRememberMe(true);
        }
    }, []);

    // #3 Client-side validation
    const validate = (): string | null => {
        if (!email.trim()) return "Email wajib diisi";
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
            return "Format email tidak valid";
        if (!password) return "Password wajib diisi";
        if (password.length < 4)
            return "Password minimal 4 karakter";
        return null;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        // #3 Validate before calling API
        const validationError = validate();
        if (validationError) {
            setError(validationError);
            return;
        }

        setIsLoading(true);
        const result = await login(email, password, rememberMe);
        if (!result.success) {
            setError(result.message || "Login gagal");
        }
        setIsLoading(false);
    };

    return (
        <div className="min-h-screen flex bg-slate-50 dark:bg-[#060910]">
            {/* ─── Left Panel: Branding ─── */}
            <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden">
                {/* Background */}
                <div className="absolute inset-0">
                    <div className="absolute inset-0 bg-gradient-to-br from-gold-50 via-white to-slate-100 dark:from-[#1a1207] dark:via-[#0d1117] dark:to-[#0a0e16]" />
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gold-400/10 dark:bg-gold-400/8 rounded-full blur-[120px] animate-pulse" />
                    <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gold-300/10 dark:bg-gold-600/6 rounded-full blur-[100px] animate-pulse [animation-delay:2s]" />
                    <div className="absolute top-1/2 left-1/3 w-[300px] h-[300px] bg-gold-200/10 dark:bg-gold-300/5 rounded-full blur-[80px] animate-pulse [animation-delay:4s]" />
                </div>

                {/* Grid pattern overlay */}
                <div
                    className="absolute inset-0 opacity-[0.04] dark:opacity-[0.03]"
                    style={{
                        backgroundImage: `linear-gradient(rgba(212,168,55,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(212,168,55,0.3) 1px, transparent 1px)`,
                        backgroundSize: "60px 60px",
                    }}
                />

                {/* Right edge line */}
                <div className="absolute top-0 right-0 w-[1px] h-full bg-gradient-to-b from-transparent via-gold-400/20 to-transparent" />

                {/* Content — centered */}
                <div className="relative z-10 flex flex-col justify-center items-center p-10 w-full h-full">
                    <div className="flex flex-col items-center text-center space-y-5 max-w-md">
                        {/* Large Logo with glow */}
                        <div className="relative mb-2">
                            <div className="absolute inset-0 bg-gold-400/15 dark:bg-gold-400/10 rounded-full blur-3xl scale-[2]" />
                            <img
                                src="/ksmlogo.png"
                                alt="KSM Logo"
                                className="relative w-72 h-72 object-contain drop-shadow-2xl"
                            />
                        </div>

                        {/* System badge + title */}
                        <div className="space-y-3">
                            <div className="inline-flex items-center gap-2 rounded-full bg-gold-400/10 border border-gold-400/20 px-4 py-1.5">
                                <Flame className="h-3.5 w-3.5 text-gold-400" />
                                <span className="text-xs font-medium text-gold-600 dark:text-gold-400">
                                    Invoice Management System
                                </span>
                            </div>
                            <h1 className="text-3xl font-bold leading-tight text-slate-800 dark:text-white">
                                Invoice <span className="gold-text">Out</span> System
                            </h1>
                            <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed max-w-sm mx-auto">
                                Kelola invoice perusahaan dengan mudah, aman, dan efisien.
                                Terintegrasi untuk seluruh divisi KSM.
                            </p>
                        </div>

                        {/* Feature highlights — compact row */}
                        <div className="grid grid-cols-4 gap-2 w-full pt-2">
                            {[
                                { icon: FileText, label: "Invoice" },
                                { icon: Shield, label: "Approval" },
                                { icon: TrendingUp, label: "Analytics" },
                                { icon: Flame, label: "Oil & Gas" },
                            ].map((feat) => (
                                <div
                                    key={feat.label}
                                    className="flex flex-col items-center gap-2 rounded-xl bg-white/60 dark:bg-white/[0.02] border border-gold-200/40 dark:border-white/[0.04] py-3 px-2 hover:bg-gold-50 dark:hover:bg-gold-400/[0.03] hover:border-gold-300/50 dark:hover:border-gold-400/10 transition-all duration-300 shadow-sm dark:shadow-none"
                                >
                                    <div className="rounded-lg bg-gold-400/15 dark:bg-gold-400/10 p-2">
                                        <feat.icon className="h-4 w-4 text-gold-500 dark:text-gold-400" />
                                    </div>
                                    <p className="text-[11px] font-medium text-slate-600 dark:text-white/80">
                                        {feat.label}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Bottom copyright */}
                    <p className="absolute bottom-6 text-[11px] text-slate-400 dark:text-slate-600">
                        © 2026 PT Kian Santang Muliatama Tbk. All rights reserved.
                    </p>
                </div>
            </div>

            {/* ─── Right Panel: Login Form ─── */}
            <div className="flex flex-1 flex-col items-center justify-center relative px-6 py-12">
                {/* Background */}
                <div className="absolute inset-0 bg-gradient-to-bl from-slate-100 to-white dark:from-[#0d1117] dark:to-[#060910]" />
                <div className="absolute top-20 right-20 w-72 h-72 bg-gold-400/[0.06] dark:bg-gold-400/[0.04] rounded-full blur-[100px]" />

                {/* Theme toggle — top right */}
                <div className="absolute top-5 right-5 z-20">
                    <ThemeToggle className="rounded-full bg-white/80 dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-sm hover:bg-slate-100 dark:hover:bg-white/10" />
                </div>

                <div className="relative z-10 w-full max-w-sm">
                    {/* Mobile logo */}
                    <div className="lg:hidden text-center mb-10">
                        <img
                            src="/ksmlogo.png"
                            alt="KSM Logo"
                            className="mx-auto w-40 h-40 object-contain mb-3"
                        />
                        <h1 className="text-xl font-bold text-slate-800 dark:text-white">
                            KSM <span className="gold-text">Invoice</span>
                        </h1>
                        <p className="text-xs text-slate-500 mt-1">
                            PT Kian Santang Muliatama Tbk
                        </p>
                    </div>

                    {/* Form header */}
                    <div className="mb-8">
                        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">
                            Selamat Datang
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5">
                            Masuk ke akun Anda untuk melanjutkan
                        </p>
                    </div>

                    {/* Error alert */}
                    {error && (
                        <div className="flex items-center gap-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/15 px-4 py-3 mb-6 animate-in fade-in slide-in-from-top-2 duration-300">
                            <AlertTriangle className="h-4 w-4 text-red-500 dark:text-red-400 shrink-0" />
                            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-2">
                            <Label
                                htmlFor="email"
                                className="text-sm text-slate-600 dark:text-slate-300 font-medium"
                            >
                                Email
                            </Label>
                            <div className="relative group">
                                <Input
                                    ref={emailRef}
                                    id="email"
                                    type="email"
                                    placeholder="nama@ksm.co.id"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    autoComplete="email"
                                    className="h-12 bg-white dark:bg-white/[0.04] border-slate-200 dark:border-white/[0.08] text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 rounded-xl focus-visible:ring-1 focus-visible:ring-gold-400/50 focus-visible:border-gold-400/30 transition-all duration-300 shadow-sm dark:shadow-none"
                                />
                                <div className="absolute inset-0 rounded-xl bg-gold-400/5 opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label
                                htmlFor="password"
                                className="text-sm text-slate-600 dark:text-slate-300 font-medium"
                            >
                                Password
                            </Label>
                            <div className="relative group">
                                <Input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    autoComplete="current-password"
                                    className="h-12 bg-white dark:bg-white/[0.04] border-slate-200 dark:border-white/[0.08] text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 rounded-xl focus-visible:ring-1 focus-visible:ring-gold-400/50 focus-visible:border-gold-400/30 transition-all duration-300 pr-12 shadow-sm dark:shadow-none"
                                />
                                <div className="absolute inset-0 rounded-xl bg-gold-400/5 opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none" />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors z-10"
                                >
                                    {showPassword ? (
                                        <EyeOff className="h-4 w-4" />
                                    ) : (
                                        <Eye className="h-4 w-4" />
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* #1 Remember me checkbox */}
                        <div className="flex items-center gap-2">
                            <Checkbox
                                id="remember"
                                checked={rememberMe}
                                onCheckedChange={(v: boolean) =>
                                    setRememberMe(v === true)
                                }
                                className="border-slate-300 dark:border-white/20 data-[state=checked]:bg-gold-400 data-[state=checked]:border-gold-400"
                            />
                            <Label
                                htmlFor="remember"
                                className="text-sm text-slate-500 dark:text-slate-400 cursor-pointer select-none"
                            >
                                Ingat saya
                            </Label>
                        </div>

                        <Button
                            type="submit"
                            disabled={isLoading}
                            className="w-full h-12 rounded-xl text-sm font-semibold gold-gradient text-white shadow-lg shadow-gold-400/20 hover:shadow-gold-400/35 hover:scale-[1.01] active:scale-[0.99] transition-all duration-300"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Memproses...
                                </>
                            ) : (
                                "Masuk"
                            )}
                        </Button>
                    </form>

                    {/* Bottom info */}
                    <div className="mt-10 text-center space-y-3">
                        <div className="w-full border-t border-slate-200 dark:border-white/[0.06]" />
                        <p className="text-xs text-slate-400 dark:text-slate-600 pt-2">
                            Dengan masuk, Anda menyetujui ketentuan penggunaan sistem KSM
                        </p>
                        <div className="flex items-center justify-center gap-2">
                            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <p className="text-xs text-slate-400 dark:text-slate-500">
                                System Online — v1.0
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
