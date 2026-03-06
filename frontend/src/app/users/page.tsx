"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import {
    Search,
    UserCog,
    Loader2,
    Shield,
    ShieldCheck,
    User,
    Info
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

interface UserData {
    id: number;
    name: string;
    email: string;
    role: string;
    active: boolean;
    created_at: string;
}

const roleConfig: Record<string, { label: string; className: string; icon: any }> = {
    admin: { label: "Admin", className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400", icon: Shield },
    manager: { label: "Manager", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", icon: ShieldCheck },
    user: { label: "Staff", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", icon: User },
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8081";

export default function UsersPage() {
    const { token } = useAuth();
    const [users, setUsers] = useState<UserData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    const fetchUsers = async () => {
        if (!token) return;
        setIsLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/users`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (data.success) {
                setUsers(data.data || []);
            } else {
                toast.error(data.message || "Gagal memuat data users");
            }
        } catch (err) {
            toast.error("Tidak dapat terhubung ke server");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, [token]);

    const filteredUsers = users.filter(
        (u) =>
            u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            u.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Daftar Pengguna</h1>
                    <p className="text-sm text-muted-foreground">
                        Direktori pengguna tersinkronisasi dari Cost Control Auth
                    </p>
                </div>
            </div>

            {/* SSO Info Notice */}
            <div className="bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg p-4 flex gap-3 text-sm text-blue-800 dark:text-blue-300">
                <Info className="h-5 w-5 shrink-0" />
                <div>
                    <strong>Pemberitahuan Sistem SSO:</strong> Karena sistem ini menggunakan otentikasi terpusat (SSO) dari Cost Control API, manajemen pengguna (tambah, edit password, hapus, dan perubahan role) dilakukan sepenuhnya di sistem Cost Control. Daftar di bawah ini hanya pantauan *read-only* atas siapa saja yang memiliki akses ke modul Invoice Out.
                </div>
            </div>

            {/* Search */}
            <Card className="glass-card">
                <CardContent className="p-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Cari nama atau email..."
                            className="pl-9 bg-white/50 dark:bg-white/5"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Users Table */}
            <Card className="glass-card">
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent border-border/50">
                                    <TableHead className="font-semibold">User</TableHead>
                                    <TableHead className="font-semibold">Email</TableHead>
                                    <TableHead className="font-semibold">Role dari SSO</TableHead>
                                    <TableHead className="font-semibold">Status Login Terakhir</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-48 text-center">
                                            <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                                                <Loader2 className="h-6 w-6 animate-spin text-gold-400" />
                                                <span>Memuat data...</span>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : filteredUsers.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-48 text-center text-muted-foreground">
                                            {searchQuery ? "Tidak ada user yang cocok" : "Belum ada user."}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredUsers.map((u) => {
                                        const role = roleConfig[u.role] || roleConfig.user;
                                        return (
                                            <TableRow key={u.id} className="hover:bg-muted/30 transition-colors border-border/30">
                                                <TableCell>
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gold-400/10 shrink-0">
                                                            <UserCog className="h-3.5 w-3.5 text-gold-400" />
                                                        </div>
                                                        <span className="font-medium text-sm">{u.name}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className={`text-xs border-0 ${role.className}`}>
                                                        {role.label}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className={`text-xs border-0 ${u.active ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"}`}>
                                                        {u.active ? "Tersinkronisasi" : "Nonaktif"}
                                                    </Badge>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
