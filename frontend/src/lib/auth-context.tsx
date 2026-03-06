"use client";

import {
    createContext,
    useContext,
    useEffect,
    useState,
    useCallback,
    ReactNode,
} from "react";
import { useRouter, usePathname } from "next/navigation";
import { toast } from "sonner";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8081";

interface User {
    user_id: number;
    name: string;
    email: string;
    role: string;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    isLoading: boolean;
    login: (
        email: string,
        password: string,
        rememberMe?: boolean
    ) => Promise<{ success: boolean; message?: string }>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ── JWT helpers ──

function parseJWT(token: string): { exp?: number;[key: string]: unknown } | null {
    try {
        const base64 = token.split(".")[1];
        const json = atob(base64.replace(/-/g, "+").replace(/_/g, "/"));
        return JSON.parse(json);
    } catch {
        return null;
    }
}

function isTokenExpired(token: string): boolean {
    const payload = parseJWT(token);
    if (!payload?.exp) return true;
    // expired if less than 30 seconds remaining
    return payload.exp * 1000 < Date.now() + 30_000;
}

// ── Provider ──

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();
    const pathname = usePathname();

    // Load token from localStorage on mount + check expiry
    useEffect(() => {
        const savedToken = localStorage.getItem("access_token");
        const savedUser = localStorage.getItem("user");

        if (savedToken && savedUser) {
            if (isTokenExpired(savedToken)) {
                // Token expired — clear and redirect
                localStorage.removeItem("access_token");
                localStorage.removeItem("user");
                localStorage.removeItem("remember_me");
                toast.error("Sesi Anda telah berakhir, silakan login kembali");
            } else {
                setToken(savedToken);
                setUser(JSON.parse(savedUser));
            }
        }
        setIsLoading(false);
    }, []);

    // Periodic token expiry check (every 60s)
    useEffect(() => {
        if (!token) return;

        const interval = setInterval(() => {
            if (isTokenExpired(token)) {
                setToken(null);
                setUser(null);
                localStorage.removeItem("access_token");
                localStorage.removeItem("user");
                localStorage.removeItem("remember_me");
                toast.error("Sesi Anda telah berakhir, silakan login kembali");
                router.replace("/login");
            }
        }, 60_000);

        return () => clearInterval(interval);
    }, [token, router]);

    // Redirect to login if not authenticated (except on /login page)
    useEffect(() => {
        if (!isLoading && !token && pathname !== "/login") {
            router.replace("/login");
        }
    }, [isLoading, token, pathname, router]);

    const login = useCallback(
        async (email: string, password: string, rememberMe = false) => {
            try {
                const res = await fetch(`${API_URL}/api/auth/login`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        email,
                        password,
                        remember_me: rememberMe,
                    }),
                });

                const data = await res.json();

                if (data.success && data.data) {
                    const { access_token, user: userData } = data.data;
                    setToken(access_token);
                    setUser(userData);
                    localStorage.setItem("access_token", access_token);
                    localStorage.setItem("user", JSON.stringify(userData));
                    if (rememberMe) {
                        localStorage.setItem("remember_me", "true");
                    }
                    toast.success(`Selamat datang, ${userData.name}!`);
                    router.push("/");
                    return { success: true };
                }

                return {
                    success: false,
                    message: data.message || "Login gagal",
                };
            } catch {
                return {
                    success: false,
                    message: "Tidak dapat terhubung ke server",
                };
            }
        },
        [router]
    );

    const logout = useCallback(() => {
        setToken(null);
        setUser(null);
        localStorage.removeItem("access_token");
        localStorage.removeItem("user");
        localStorage.removeItem("remember_me");
        toast.success("Berhasil logout");
        router.push("/login");
    }, [router]);

    return (
        <AuthContext.Provider value={{ user, token, isLoading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used within AuthProvider");
    return ctx;
}
