"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "sonner";
import { Loader2 } from "lucide-react";

// #6 Loading skeleton while checking auth state
function AuthLoadingGate({ children }: { children: React.ReactNode }) {
    const { isLoading } = useAuth();

    if (isLoading) {
        return (
            <div className="flex h-screen w-screen items-center justify-center bg-slate-50 dark:bg-[#060910]">
                <div className="flex flex-col items-center gap-4">
                    <img
                        src="/ksmlogo.png"
                        alt="KSM Logo"
                        className="w-20 h-20 object-contain animate-pulse"
                    />
                    <div className="flex items-center gap-2 text-slate-400">
                        <Loader2 className="h-4 w-4 animate-spin text-gold-400" />
                        <span className="text-sm">Memuat...</span>
                    </div>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}

function AppShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isLoginPage = pathname === "/login";

    if (isLoginPage) {
        return <>{children}</>;
    }

    return (
        <div className="flex h-screen overflow-hidden">
            <Sidebar />
            <div className="flex flex-1 flex-col overflow-hidden">
                <Header />
                <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
            </div>
        </div>
    );
}

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange
        >
            <AuthProvider>
                <TooltipProvider>
                    <AuthLoadingGate>
                        <AppShell>{children}</AppShell>
                    </AuthLoadingGate>
                </TooltipProvider>
                <Toaster
                    position="top-right"
                    richColors
                    toastOptions={{
                        style: {
                            borderRadius: "12px",
                        },
                    }}
                />
            </AuthProvider>
        </ThemeProvider>
    );
}
